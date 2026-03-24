# The Butcher Online — Monorepo

Full-stack platform for a premium butcher's online ordering and delivery business.

## Architecture

```
/
├── apps/
│   ├── storefront/     # Next.js 14 — customer-facing shop
│   ├── admin/          # React + Vite — staff command centre
│   ├── api/            # Hono API on Cloudflare Workers
│   └── driver/         # React PWA — driver field app
├── packages/
│   ├── db/             # Drizzle ORM schema & migrations (SQLite / Cloudflare D1)
│   ├── shared/         # TypeScript types, constants
│   └── ui/             # Radix UI + Tailwind component library
└── workers/
    ├── gps-relay/      # Cloudflare Worker — driver GPS relay
    ├── image-upload/   # Cloudflare Worker — R2 image uploads
    ├── payment-handler/# Cloudflare Worker — Stripe webhook processor
    ├── route-proxy/    # Cloudflare Worker — Google Maps route optimiser
    └── pdf-generator/  # Cloudflare Worker — packing list HTML generator
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Wrangler CLI (`npm i -g wrangler`)

## Setup

```bash
# Install all dependencies
pnpm install

# Copy and fill in environment variables
cp apps/storefront/.env.local.example apps/storefront/.env.local
cp apps/admin/.env.local.example      apps/admin/.env.local
cp apps/driver/.env.local.example     apps/driver/.env.local
cp .env.example                       .env
```

## Development

```bash
# Run all apps in parallel
pnpm dev

# Run individual apps
pnpm --filter storefront dev    # http://localhost:3000
pnpm --filter admin dev         # http://localhost:5173
pnpm --filter driver dev        # http://localhost:5174
pnpm --filter @butcher/api dev  # Cloudflare Workers on 8787
```

## Apps

### Storefront (`apps/storefront`)
- **Framework**: Next.js 14 (App Router)
- **Features**: Product catalogue, cart, checkout, order tracking, customer account

### Admin (`apps/admin`)
- **Framework**: React + Vite
- **Features**: Dashboard, orders management, product CRUD, delivery day scheduling, stock tracking, driver map, audit log

### Driver PWA (`apps/driver`)
- **Framework**: React + Vite + vite-plugin-pwa
- **Features**: Daily stops list, stop navigation, delivery confirmation, GPS tracking (30s pings to Cloudflare Worker)

### API (`apps/api`)
- **Framework**: Hono on Cloudflare Workers
- **Features**: All business logic — orders, customers, products, stock, delivery, payments (Stripe/Square), email (Resend), web push notifications

## Cloudflare Workers

```bash
# Deploy all workers
pnpm --filter gps-relay deploy
pnpm --filter payment-handler deploy
pnpm --filter route-proxy deploy
pnpm --filter pdf-generator deploy
pnpm --filter image-upload deploy
```

## Build

```bash
pnpm build
```

## Environment Variables Reference

See `.env.example` for all required variables including Clerk, Stripe, Resend, Cloudflare, and Google Maps keys.
