#!/usr/bin/env bash
# Headless self-deploy driver for agentty.org. Called by the webhook listener
# (instant, on push) and the systemd timer (backstop poll). Safe to run any time
# and concurrently — a flock guarantees one deploy at a time; a second trigger
# during a build is coalesced into one follow-up run.
#
# What it does:
#   1. Fast-forward the site repo to origin/master (docs + code both live in git).
#   2. Run deploy.sh, which itself pulls docs/website from the agentty repo,
#      refetches version/sizes/stars, builds, rsyncs to /var/www, reloads nginx.
#
# Nothing here needs a human. Logs go to $LOG (journald also captures stdout
# when run under systemd).
set -uo pipefail

PROJECT="/home/ayush/projects/agentpp-site"
LOCK="/tmp/agentty-autodeploy.lock"
BRANCH="master"

# The CONTENT repo: docs/website lives here, and the sync scripts pull it from
# GitHub (never a local checkout). We poll its HEAD so the timer can skip the
# build when nothing has changed.
CONTENT_REPO="${CONTENT_REPO:-1ay1/agentty}"
CONTENT_REF="${AGENTTY_DOCS_REF:-master}"

# Where the last successfully-built pair of SHAs is recorded.
STATE="$HOME/.agentty-deploy/last-built"

# Rebuild at least this often even with no commits: the site renders live
# GitHub data (release version, binary sizes, stars) that moves without any
# push, so a pure commit check would freeze it.
MAX_SKIP_HOURS="${MAX_SKIP_HOURS:-12}"

# Prefer /var/log; fall back to a user-writable dir so logging never breaks the
# deploy on a box where /var/log isn't pre-provisioned.
if mkdir -p /var/log/agentty-deploy 2>/dev/null && [ -w /var/log/agentty-deploy ]; then
  LOG="/var/log/agentty-deploy/autodeploy.log"
else
  mkdir -p "$HOME/.agentty-deploy" 2>/dev/null || true
  LOG="$HOME/.agentty-deploy/autodeploy.log"
fi

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

# Coalescing lock: if a deploy is already running, drop a "rerun" flag and exit;
# the running deploy checks the flag at the end and loops once more. This means a
# burst of pushes → exactly one extra deploy, never a pile-up.
exec 9>"$LOCK"
if ! flock -n 9; then
  log "deploy in progress — requesting a follow-up run"
  touch "${LOCK}.rerun"
  exit 0
fi

# Remember what we just built, so the next poll can tell "nothing changed"
# from "never built". Written only after a SUCCESSFUL deploy -- recording a
# failed build would make the next run skip it.
record_built() {
  mkdir -p "$(dirname "$STATE")" 2>/dev/null || true
  {
    echo "LAST_SITE_SHA=$1"
    echo "LAST_CONTENT_SHA=$2"
    echo "LAST_BUILD_EPOCH=$(date -u +%s)"
  } > "$STATE"
}

deploy_once() {
  cd "$PROJECT" || { log "FATAL: cannot cd $PROJECT"; return 1; }

  log "fetching origin/$BRANCH"
  git fetch --quiet origin "$BRANCH" || { log "git fetch failed"; return 1; }

  local before after
  before=$(git rev-parse HEAD)
  after=$(git rev-parse "origin/$BRANCH")

  # Reset hard to origin so a headless deploy never wedges on local drift
  # (generated files get rewritten by deploy.sh anyway).
  git reset --hard "origin/$BRANCH" --quiet || { log "git reset failed"; return 1; }

  if [ "$before" != "$after" ]; then
    log "site repo $before → $after"
  fi

  # ── Poll the content repo, and skip the build if nothing moved ──────────
  #
  # One API call for the ref's SHA; no clone, no checkout. Empty on a network
  # error or rate-limit, which deliberately falls through to building rather
  # than skipping -- a failed poll must not be mistaken for "unchanged".
  local content_sha=""
  content_sha=$(curl -fsSL \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${CONTENT_REPO}/commits/${CONTENT_REF}" \
      2>/dev/null | sed -n 's/^  "sha": "\([0-9a-f]\{40\}\)",$/\1/p' | head -1)

  mkdir -p "$(dirname "$STATE")" 2>/dev/null || true
  local last_site="" last_content="" last_epoch=0
  if [ -r "$STATE" ]; then
    # shellcheck disable=SC1090
    . "$STATE" 2>/dev/null || true
    last_site="${LAST_SITE_SHA:-}"
    last_content="${LAST_CONTENT_SHA:-}"
    last_epoch="${LAST_BUILD_EPOCH:-0}"
  fi

  local now age_h
  now=$(date -u +%s)
  age_h=$(( (now - last_epoch) / 3600 ))

  if [ "${FORCE:-0}" = "1" ]; then
    log "FORCE=1 — building regardless"
  elif [ -z "$content_sha" ]; then
    log "content SHA poll failed — building rather than assuming unchanged"
  elif [ "$after" = "$last_site" ] && [ "$content_sha" = "$last_content" ] \
       && [ "$age_h" -lt "$MAX_SKIP_HOURS" ]; then
    log "no change — site $after, content ${content_sha:0:7}, last built ${age_h}h ago — skipping build"
    return 0
  elif [ "$after" = "$last_site" ] && [ "$content_sha" = "$last_content" ]; then
    log "no commits, but last build was ${age_h}h ago (>= ${MAX_SKIP_HOURS}h) — rebuilding to refresh live GitHub data"
  else
    log "content ${last_content:0:7} → ${content_sha:0:7}"
  fi

  # No local content checkout to babysit any more.
  #
  # This used to fast-forward ../agentty, because sync-docs.mjs/sync-content.mjs
  # PREFERRED that checkout over GitHub -- so the site built from whatever was
  # on this box. The guard skipped the pull whenever the tree was dirty, and
  # four orphaned submodule directories made it dirty forever, so it latched
  # exactly as its own comment warned: /docs/sandboxing/ served a page written
  # before claybin existed while master's copy was current, and every deploy
  # reported OK.
  #
  # The sync scripts now fetch from the remote repo at $AGENTTY_DOCS_REF
  # (default master) with no implicit local source, which removes the failure
  # mode rather than guarding it.

  log "running deploy.sh"
  # Retry once on failure: the Next static-export step can flake transiently
  # (ENOENT under .next). deploy.sh now cleans .next up front, but a retry makes
  # the headless path self-healing so a one-off blip never leaves the site stale.
  if ./deploy.sh >>"$LOG" 2>&1; then
    log "deploy OK — https://agentty.org is live"
    record_built "$after" "$content_sha"
  else
    log "deploy.sh failed — retrying once"
    if ./deploy.sh >>"$LOG" 2>&1; then
      log "deploy OK on retry — https://agentty.org is live"
      record_built "$after" "$content_sha"
    else
      log "deploy.sh FAILED twice (see above)"
      return 1
    fi
  fi
}

rc=0
deploy_once || rc=1

# Handle any follow-up requested while we were building.
if [ -f "${LOCK}.rerun" ]; then
  rm -f "${LOCK}.rerun"
  log "follow-up run requested during build — deploying once more"
  deploy_once || rc=1
fi

exit "$rc"
