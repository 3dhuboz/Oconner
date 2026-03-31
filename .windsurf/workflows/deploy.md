---
description: Build and deploy all apps (or individual apps) to Cloudflare
---

## Deploy all apps to Cloudflare

Builds each app locally then pushes pre-built artifacts directly to Cloudflare — much faster than waiting for Cloudflare's CI queue.

### Deploy API only
// turbo
1. Run: `node node_modules\wrangler\bin\wrangler.js deploy --config apps\api\wrangler.toml`

### Deploy Admin only
2. Run: `pnpm --filter @butcher/admin run build`
// turbo
3. Run: `node node_modules\wrangler\bin\wrangler.js pages deploy apps\admin\dist --project-name butcher-admin --branch main`

### Deploy Driver only
4. Run: `pnpm --filter @butcher/driver run build`
// turbo
5. Run: `node node_modules\wrangler\bin\wrangler.js pages deploy apps\driver\dist --project-name butcher-driver --branch main`

### Deploy Storefront only
6. Run: `pnpm --filter @butcher/storefront run build:cf`
// turbo
7. Run: `node node_modules\wrangler\bin\wrangler.js pages deploy apps\storefront\.vercel\output\static --project-name butcher-storefront --branch main`

### Deploy everything
Run steps 1–7 in order above.
