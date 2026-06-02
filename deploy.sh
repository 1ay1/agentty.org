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

echo "==> Measuring the real agentty binary (size + cold-start)"
# Regenerates lib/stats.generated.ts so the site's numbers always match the
# binary that's actually installed. Never fails the deploy if the binary is
# absent — it just keeps the last committed measurement.
node scripts/measure-stats.mjs || echo "   (measurement skipped; using committed stats)"

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

echo "==> Syncing nginx vhost (includes stats + analytics subdomains)"
sudo cp "$PROJECT/${DOMAIN}.nginx" "/etc/nginx/sites-available/${DOMAIN}"
sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. https://${DOMAIN} is live."
echo "    Server-side stats:  https://stats.${DOMAIN}"
echo "    Product analytics:  https://analytics.${DOMAIN}"

