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

  if [ "$before" = "$after" ] && [ "${FORCE:-0}" != "1" ]; then
    log "already at $after — site rebuild still runs to refresh live GitHub data"
  else
    log "site repo $before → $after"
  fi

  # Refresh the CONTENT repo before building. sync-content.mjs/sync-docs.mjs
  # prefer the local sibling checkout over GitHub, so a stale ../agentty here
  # SHADOWS origin and the site silently rebuilds from an old content snapshot
  # (this is exactly how a published blog post stayed invisible while every
  # deploy still reported OK). Fast-forward only, and never fatal: if the
  # checkout is dirty or diverged we log it and fall through rather than
  # failing the deploy.
  content_repo="${CONTENT_REPO:-/home/ayush/projects/agentty}"
  if [ -d "$content_repo/.git" ]; then
    # --ignore-submodules=all: submodule POINTER drift (maya/mcp-cpp moving
    # ahead locally) is routine on a dev box and says nothing about the site
    # content under docs/website/. Only real tracked-file edits should block
    # the pull, otherwise this guard latches on forever and we're back to
    # silently building stale content.
    if [ -n "$(git -C "$content_repo" status --porcelain --ignore-submodules=all 2>/dev/null)" ]; then
      log "WARNING: content repo $content_repo is dirty — NOT pulling; site may build from stale content"
    else
      c_before=$(git -C "$content_repo" rev-parse --short HEAD 2>/dev/null)
      if git -C "$content_repo" fetch --quiet origin master 2>/dev/null &&
         git -C "$content_repo" merge --ff-only origin/master --quiet 2>/dev/null; then
        c_after=$(git -C "$content_repo" rev-parse --short HEAD 2>/dev/null)
        if [ "$c_before" = "$c_after" ]; then
          log "content repo already current at $c_after"
        else
          log "content repo $c_before → $c_after"
        fi
      else
        log "WARNING: content repo fast-forward failed (diverged?) — building from $c_before"
      fi
    fi
  else
    log "content repo $content_repo not found — sync scripts will fall back to GitHub"
  fi

  log "running deploy.sh"
  # Retry once on failure: the Next static-export step can flake transiently
  # (ENOENT under .next). deploy.sh now cleans .next up front, but a retry makes
  # the headless path self-healing so a one-off blip never leaves the site stale.
  if ./deploy.sh >>"$LOG" 2>&1; then
    log "deploy OK — https://agentty.org is live"
  else
    log "deploy.sh failed — retrying once"
    if ./deploy.sh >>"$LOG" 2>&1; then
      log "deploy OK on retry — https://agentty.org is live"
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
