#!/usr/bin/env bash
# Deploy the agentpp.dev site and (re)issue the wildcard SSL cert.
# Safe to re-run. Run from anywhere.
set -euo pipefail

PROJECT="/home/ayush/projects/agentpp-site"
WEBROOT="/var/www/agentpp.dev"
ZONE="5f46e5955e207628b6426301fd7948b1"
CF_INI="/etc/letsencrypt/cloudflare.ini"
DOMAIN="agentpp.dev"

echo "==> Building static site"
cd "$PROJECT"
npm run build

echo "==> Deploying to $WEBROOT"
sudo mkdir -p "$WEBROOT"
sudo rsync -a --delete "$PROJECT/out/" "$WEBROOT/"
sudo chown -R http:http "$WEBROOT" 2>/dev/null || sudo chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

echo "==> Checking DNS delegation"
if ! dig +short NS "$DOMAIN" @8.8.8.8 | grep -q cloudflare; then
  echo "!! $DOMAIN is not yet delegated to Cloudflare nameservers."
  echo "!! Set these at your registrar, then re-run:"
  echo "     melinda.ns.cloudflare.com"
  echo "     yisroel.ns.cloudflare.com"
  echo "Site is deployed and served over HTTP in the meantime."
  exit 0
fi

echo "==> Issuing/renewing wildcard cert (*.${DOMAIN})"
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials "$CF_INI" \
  --dns-cloudflare-propagation-seconds 45 \
  -d "$DOMAIN" -d "*.${DOMAIN}" \
  --non-interactive --agree-tos -m "admin@${DOMAIN}" \
  --cert-name "$DOMAIN"

echo "==> Installing full HTTPS nginx vhost"
sudo cp "$PROJECT/agentpp.dev.nginx" "/etc/nginx/sites-available/${DOMAIN}"
sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. https://${DOMAIN} is live."
