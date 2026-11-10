#!/usr/bin/env bash
# recordings.sh — keep the home demo and the docs clips in step with agentty.
#
# Run by agentty-recordings.timer (every 3 h) and by the deploy webhook when an
# agentty release is published. Cheap when nothing changed: it compares the
# latest release with demo/recordings.json and public/clips/manifest.json and
# exits. When agentty moved, it re-records in its OWN checkout
# (~/.cache/agentty-recordings) — the autodeploy's `git reset --hard` never
# touches it — validates every recording, commits what passed, and pushes,
# which deploys the site like any other push.
set -euo pipefail

SITE=/home/ayush/projects/agentpp-site
WORK=${AGENTTY_RECORDINGS_DIR:-$HOME/.cache/agentty-recordings}
LOG=/tmp/agentty-recordings.log
exec 9>/tmp/agentty-recordings.lock
flock -n 9 || { echo "recordings: already running"; exit 0; }

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
echo "[$(ts)] recordings: start" | tee -a "$LOG"

# a dedicated clone, always reset to the site's latest master
if [ ! -d "$WORK/.git" ]; then
  git clone -q "$(git -C "$SITE" remote get-url origin)" "$WORK"
fi
git -C "$WORK" fetch -q origin master
git -C "$WORK" reset -q --hard origin/master
git -C "$WORK" clean -qfd
# reuse the site checkout's dependencies (node-pty, @xterm/headless)
[ -e "$WORK/node_modules" ] || ln -s "$SITE/node_modules" "$WORK/node_modules"
[ -e "$WORK/deploy/live/node_modules" ] || ln -s "$SITE/deploy/live/node_modules" "$WORK/deploy/live/node_modules"

cd "$WORK"
set +e
node scripts/update-recordings.mjs --push 2>&1 | tee -a "$LOG"
rc=${PIPESTATUS[0]}
set -e
echo "[$(ts)] recordings: done (exit $rc)" | tee -a "$LOG"
# 2 = some recordings failed their checks and kept their last good version;
# that's reported, not fatal
[ "$rc" -eq 0 ] || [ "$rc" -eq 2 ]
