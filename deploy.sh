#!/usr/bin/env bash
# Deploy the agentty.org site. Safe to re-run. Run from anywhere.
# The analytics dashboard (GoAccess) lives in /var/lib/goaccess/html and the
# Umami stack runs in Docker, so neither is touched by this deploy.
set -euo pipefail

PROJECT="/home/ayush/projects/agentpp-site"
WEBROOT="/var/www/agentty.org"
DOMAIN="agentty.org"

echo "==> Building static site"
cd "$PROJECT"

echo "==> Syncing docs from the agentty repo (docs/website/*.md)"
# Pulls the docs source of truth out of 1ay1/agentty into content/docs/ and
# regenerates the frontmatter-derived sidebar (lib/docs-nav.generated.ts).
# Prefers a sibling ../agentty checkout, else fetches from GitHub. Never fails
# the deploy — falls back to the committed content/docs on any error.
node scripts/sync-docs.mjs || echo "   (docs sync skipped; using committed content/docs)"

echo "==> Measuring the real agentty binary (size + cold-start)"
# Regenerates lib/stats.generated.ts so the site's numbers always match the
# binary that's actually installed. Never fails the deploy if the binary is
# absent — it just keeps the last committed measurement.
node scripts/measure-stats.mjs || echo "   (measurement skipped; using committed stats)"

echo "==> Fetching the latest GitHub release (version + per-platform sizes)"
# Regenerates lib/release.generated.ts from the Releases API. Never fails the
# deploy on a network error / rate-limit — keeps the committed release data.
node scripts/fetch-release.mjs || echo "   (release fetch skipped; using committed data)"

echo "==> Fetching GitHub repo stats (stars + forks)"
# Regenerates lib/repo.generated.ts from the repo API. Never fails the deploy
# on a network error / rate-limit — keeps the committed repo data.
node scripts/fetch-repo.mjs || echo "   (repo-stats fetch skipped; using committed data)"

npm run build

echo "==> Pre-compressing static assets (gzip) for gzip_static"
# Build .gz siblings for the hashed, long-cached assets so nginx can serve
# them with zero per-request CPU. Skips already-tiny / already-compressed files.
find "$PROJECT/out" -type f \
  \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \
     -o -name '*.json' -o -name '*.txt' -o -name '*.xml' -o -name '*.webmanifest' \) \
  -size +1024c -print0 | while IFS= read -r -d '' f; do
  gzip -9 -kf "$f"
done

echo "==> Deploying to $WEBROOT"
sudo mkdir -p "$WEBROOT"
sudo rsync -a --delete "$PROJECT/out/" "$WEBROOT/"
sudo chown -R http:http "$WEBROOT" 2>/dev/null || sudo chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

echo "==> Deploying the live terminal to dev.${DOMAIN}"
# dev.agentty.org serves the SAME static export; its nginx root location
# rewrites / to the /dev/ page (the interactive agentty terminal).
DEV_WEBROOT="/var/www/dev.${DOMAIN}"
sudo mkdir -p "$DEV_WEBROOT"
sudo rsync -a --delete "$PROJECT/out/" "$DEV_WEBROOT/"
sudo chown -R http:http "$DEV_WEBROOT" 2>/dev/null || sudo chown -R nginx:nginx "$DEV_WEBROOT" 2>/dev/null || true

echo "==> Syncing nginx vhost (includes stats + analytics subdomains)"
sudo cp "$PROJECT/${DOMAIN}.nginx" "/etc/nginx/sites-available/${DOMAIN}"
sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo cp "$PROJECT/deploy/dev.${DOMAIN}.nginx" "/etc/nginx/sites-available/dev.${DOMAIN}"
sudo ln -sf "/etc/nginx/sites-available/dev.${DOMAIN}" "/etc/nginx/sites-enabled/dev.${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. https://${DOMAIN} is live."
echo "    Live terminal:      https://dev.${DOMAIN}"
echo "    Server-side stats:  https://stats.${DOMAIN}"
echo "    Product analytics:  https://analytics.${DOMAIN}"

