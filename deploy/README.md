# Automated deploys

The site auto-redeploys whenever **agentty** publishes a new release. No
manual `./deploy.sh`, no hand-editing version numbers.

## How it works

Two cooperating pieces, both already in the build:

1. **`scripts/fetch-release.mjs`** (run by `deploy.sh` before every build)
   pulls the latest GitHub release and regenerates `lib/release.generated.ts`
   — version, per-platform binary sizes, SHA-256s, download count. If the
   "latest" release hasn't uploaded its standalone binaries yet (streaming
   release: the source tarball lands first), it falls back to the newest
   release that *does* have binaries, so the install page never loses its
   download table mid-publish. `scripts/measure-stats.mjs` likewise re-measures
   the installed binary's size + cold-start.

2. **`scripts/redeploy-on-release.sh`** polls the GitHub "latest release" tag
   and runs `./deploy.sh` only when it changed (recorded in
   `.last-deployed-tag`). Idempotent — safe to run on a tight timer.

So a deploy always ships numbers measured from reality; the timer just decides
*when*.

## Install the timer (one time, on the server)

```bash
# 1. (optional) raise the GitHub API rate limit
echo 'GITHUB_TOKEN=ghp_xxx' > deploy/.env       # 60/hr → 5000/hr

# 2. install the units
sudo cp deploy/agentty-site-deploy.service /etc/systemd/system/
sudo cp deploy/agentty-site-deploy.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now agentty-site-deploy.timer

# 3. verify
systemctl list-timers agentty-site-deploy.timer
journalctl -u agentty-site-deploy.service -f
```

`deploy.sh` needs root for the `rsync` into `/var/www` and the nginx reload.
Either run the unit as a user with passwordless sudo for those steps, or change
the unit's `User=` to a dedicated deploy role.

## Force a deploy now

```bash
FORCE=1 ./scripts/redeploy-on-release.sh        # ignore the recorded tag
# or
sudo systemctl start agentty-site-deploy.service
```

## Push-based alternative (instead of polling)

If you'd rather deploy the instant a release finishes, add a final job to
agentty's `.github/workflows/release.yml` that pings the server:

```yaml
  notify-site:
    needs: [linux-x86_64, macos-arm64, windows]   # the binary build legs
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsSL -X POST -H "Authorization: Bearer ${{ secrets.SITE_DEPLOY_TOKEN }}" \
               https://deploy.agentty.org/hook
```

…backed by a tiny authenticated endpoint on the server that runs
`redeploy-on-release.sh`. The polling timer is simpler and needs no inbound
port or shared secret, so it's the default; the webhook just trades that for
lower latency.
