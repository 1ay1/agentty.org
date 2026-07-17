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

  log "running deploy.sh"
  if ./deploy.sh >>"$LOG" 2>&1; then
    log "deploy OK — https://agentty.org is live"
  else
    log "deploy.sh FAILED (see above)"
    return 1
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
