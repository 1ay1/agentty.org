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
npm run build

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

