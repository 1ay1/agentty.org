#!/usr/bin/env bash
# Redeploy the site when agentty publishes a new release.
#
# Pull-based automation: polls the GitHub "latest release" tag and, when it
# differs from the tag the site was last deployed with, runs ./deploy.sh.
# No inbound webhook, no CI secrets, no coupling to the agentty workflow — it
# just notices new releases and ships them. Idempotent and safe to run on a
# timer (see deploy/agentty-site-deploy.{service,timer}).
#
# Records the last-deployed tag in $STATE so a deploy only fires on change.
# Honors GITHUB_TOKEN (higher API rate limit) if present.
#
#   ./scripts/redeploy-on-release.sh           # deploy iff latest tag changed
#   FORCE=1 ./scripts/redeploy-on-release.sh    # deploy regardless
set -euo pipefail

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${AGENTTY_REPO:-1ay1/agentty}"
STATE="${STATE:-$PROJECT/.last-deployed-tag}"
API="https://api.github.com/repos/${REPO}/releases/latest"

log() { printf '[redeploy] %s\n' "$*"; }

hdr=(-H "User-Agent: agentty-site-redeploy" -H "Accept: application/vnd.github+json")
[ -n "${GITHUB_TOKEN:-}" ] && hdr+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")

latest_tag="$(curl -fsSL --max-time 15 "${hdr[@]}" "$API" 2>/dev/null \
  | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')" || true

if [ -z "${latest_tag:-}" ]; then
  log "could not read latest release tag (network/rate-limit) — skipping."
  exit 0
fi

last="$(cat "$STATE" 2>/dev/null || echo "")"

if [ "${FORCE:-0}" != "1" ] && [ "$latest_tag" = "$last" ]; then
  log "latest release $latest_tag already deployed — nothing to do."
  exit 0
fi

log "deploying for release $latest_tag (was: ${last:-none})"
cd "$PROJECT"
./deploy.sh

# Only record success once deploy.sh returned 0 (set -e aborts otherwise).
printf '%s\n' "$latest_tag" > "$STATE"
log "done — site now on $latest_tag"
