# agentpp.dev

The homepage and documentation site for [**agentty**](https://github.com/1ay1/agentty) — blazing-fast Claude in your terminal.

Built with **Next.js 15** (App Router) as a fully static export, deployed behind nginx with a wildcard SSL cert.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build      # static export → out/
```

## Deploy

One command builds, deploys to `/var/www/agentpp.dev`, and (once DNS is delegated to Cloudflare) issues the wildcard cert + installs the HTTPS nginx vhost:

```bash
./deploy.sh
```

### One-time DNS step

`agentpp.dev` must be delegated to Cloudflare at the registrar. Set the nameservers to:

```
melinda.ns.cloudflare.com
yisroel.ns.cloudflare.com
```

Then run `./deploy.sh` — it detects delegation, issues `*.agentpp.dev` via certbot's
Cloudflare DNS-01 plugin, and swaps the temporary HTTP vhost for the full HTTPS one.

## Structure

| Path | Contents |
|------|----------|
| `app/page.tsx` | Landing page (hero, speed, features, compare) |
| `app/docs/` | Documentation + user manual (24 pages) |
| `app/{changelog,contributing,security,…}` | OSS essentials |
| `components/` | Nav, footer, sidebar, doc helpers |
| `lib/site.ts` | Site config + navigation tree |
| `agentpp.dev.nginx` | Production HTTPS vhost |
| `deploy.sh` | Build + deploy + cert script |
