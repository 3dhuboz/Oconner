# The Butcher Online — Monorepo

Full-stack platform for a premium butcher's online ordering and delivery business.

## Architecture

```
/
├── apps/
│   ├── storefront/     # Next.js 14 — customer-facing shop
│   ├── admin/          # React + Vite — staff command centre
│   └── driver/         # React PWA — driver field app
├── packages/
│   ├── shared/         # TypeScript types, Firestore helpers, constants
│   └── ui/             # Radix UI + Tailwind component library
├── functions/          # Firebase Cloud Functions (Node 20)
├── workers/
│   ├── gps-relay/      # Cloudflare Worker — driver GPS → Firestore
│   ├── payment-handler/# Cloudflare Worker — Stripe webhook processor
│   ├── route-proxy/    # Cloudflare Worker — Google Maps route optimiser
│   └── pdf-generator/  # Cloudflare Worker — packing list HTML generator
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Firebase CLI (`npm i -g firebase-tools`)
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

# Firebase emulators (auth, firestore, functions)
firebase emulators:start
```

## Apps

### Storefront (`apps/storefront`)
- **Framework**: Next.js 14 (App Router)
- **Features**: Product catalogue, cart, checkout, order tracking, customer account
- **Env vars**: `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Admin (`apps/admin`)
- **Framework**: React + Vite
- **Features**: Dashboard, orders management, product CRUD, delivery day scheduling, stock tracking, driver map, audit log
- **Env vars**: `VITE_FIREBASE_*`, `VITE_PDF_GENERATOR_URL`, `VITE_GOOGLE_MAPS_API_KEY`

### Driver PWA (`apps/driver`)
- **Framework**: React + Vite + vite-plugin-pwa
- **Features**: Daily stops list, stop navigation, delivery confirmation, GPS tracking (30s pings to Cloudflare Worker)
- **Env vars**: `VITE_FIREBASE_*`, `VITE_GPS_RELAY_URL`

## Firebase Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `onOrderStatusChange` | Firestore write | Send email notifications via SendGrid |
| `sendDayBeforeReminders` | Scheduled (daily 8am) | Reminder emails for next-day deliveries |
| `onOrderPacked` | Firestore write | Deduct stock, send low-stock alerts |
| `onDocumentWritten` | Firestore write | Append to audit log |

```bash
# Deploy functions
firebase deploy --only functions

# Deploy Firestore rules & indexes
firebase deploy --only firestore
```

## Cloudflare Workers

```bash
# Deploy all workers
pnpm --filter gps-relay deploy
pnpm --filter payment-handler deploy
pnpm --filter route-proxy deploy
pnpm --filter pdf-generator deploy
```

## Build

```bash
pnpm build
```

## Environment Variables Reference

See `.env.example` for all required variables including Firebase, Stripe, SendGrid, Cloudflare, and Google Maps keys.
