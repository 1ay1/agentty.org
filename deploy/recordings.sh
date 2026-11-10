#!/usr/bin/env bash
# recordings.sh — keep the home demo, the docs clips and the README GIF in
# step with agentty.
#
# Run by agentty-recordings.timer (every 3 h) and by the deploy webhook when an
# agentty release is published. Cheap when nothing changed: it compares the
# latest release with demo/recordings.json and public/clips/manifest.json and
# exits. When agentty moved, it re-records in its OWN checkout
# (~/.cache/agentty-recordings) — the autodeploy's `git reset --hard` never
# touches it — validates every recording, commits what passed, and pushes,
# which deploys the site. Once that deploy is live, it films the home demo
# into https://agentty.org/agentty.gif (the README's picture).
set -euo pipefail

SITE=/home/ayush/projects/agentpp-site
WORK=${AGENTTY_RECORDINGS_DIR:-$HOME/.cache/agentty-recordings}
LOG=/tmp/agentty-recordings.log
GIF=/var/www/agentty-media/agentty.gif
DEPLOYED="$HOME/.agentty-deploy/last-built"
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
# reuse the site checkout's dependencies (node-pty, @xterm/headless,
# playwright-core); install any the site has gained since they were installed
[ -e "$WORK/node_modules" ] || ln -s "$SITE/node_modules" "$WORK/node_modules"
[ -e "$WORK/deploy/live/node_modules" ] || ln -s "$SITE/deploy/live/node_modules" "$WORK/deploy/live/node_modules"
if ! (cd "$WORK" && node -e 'const fs = require("fs"), p = require("./package.json"); for (const d of Object.keys({ ...p.dependencies, ...p.devDependencies })) if (!fs.existsSync("node_modules/" + d)) process.exit(1)'); then
  echo "[$(ts)] recordings: installing new site dependencies" | tee -a "$LOG"
  (cd "$SITE" && git checkout -q origin/master -- package.json package-lock.json 2>/dev/null; npm install --no-audit --no-fund >>"$LOG" 2>&1)
fi

cd "$WORK"
set +e
node scripts/update-recordings.mjs --push 2>&1 | tee -a "$LOG"
rc=${PIPESTATUS[0]}
set -e

# the README GIF: re-film it when the home demo it shows has changed. Wait
# for the deploy of this checkout's HEAD to be live first, so the GIF films
# the new recording.
demo_sha=$(git -C "$WORK" log -1 --format=%H -- lib/demo-screen.json)
if [ "$(cat "$GIF.src" 2>/dev/null)" != "$demo_sha" ]; then
  head=$(git -C "$WORK" rev-parse HEAD)
  for _ in $(seq 1 90); do
    deployed=$(sed -n 's/^LAST_SITE_SHA=//p' "$DEPLOYED" 2>/dev/null)
    [ -n "$deployed" ] && git -C "$WORK" merge-base --is-ancestor "$head" "$deployed" 2>/dev/null && break
    sleep 20
  done
  echo "[$(ts)] recordings: filming the home demo into $GIF" | tee -a "$LOG"
  if node scripts/render-gif.mjs https://agentty.org/ "$GIF" >>"$LOG" 2>&1; then
    echo "$demo_sha" > "$GIF.src"
  else
    echo "[$(ts)] recordings: GIF render failed (kept the previous one)" | tee -a "$LOG"
  fi
fi

echo "[$(ts)] recordings: done (exit $rc)" | tee -a "$LOG"
# 2 = some recordings failed their checks and kept their last good version;
# that's reported, not fatal
[ "$rc" -eq 0 ] || [ "$rc" -eq 2 ]
