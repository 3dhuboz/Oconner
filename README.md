<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ⚡ Wirez R Us - Electrical Field Management System

A complete electrical contractor workflow management system built with React 19, TypeScript, Clerk auth, and Cloudflare D1/R2/Pages — integrated with Xero, Twilio, and Stripe.

## 🎯 Customer Workflow Implementation

This system implements the complete **Wirez R Us Operational Workflow**:

### Phase 1: Intake & Coordination ✅
- **Email Monitoring**: Automatic job creation from inbound emails
- **Job Logging**: All work orders logged in Cloudflare D1 (SQLite)
- **Three-Try Contact Rule**: Track contact attempts with tenants
- **Form 9 Generation**: Automatic RTA Form 9 (Entry Notice) generation and email
- **Legal Entry Lock-in**: Email tenant + CC property manager with entry time

### Phase 2: Scheduling & Dispatch ✅
- **Job Allocation**: Assign electricians based on location and availability
- **Calendar Management**: Visual scheduling with entry form time slots
- **Work Order Attachment**: Attach PDFs with gate codes and access instructions
- **SMS Dispatch**: Automatic Twilio SMS notifications to electricians

### Phase 3: Field Execution ✅
- **Mobile Field Portal**: Dedicated electrician app interface
- **Digital Paperwork**: Required data capture before leaving site:
  - Labor hours (actual time spent)
  - Materials used (parts and quantities)
  - Photos (switchboard, fix, smoke alarm locations)
  - Site notes (hazards, recommendations)

### Phase 4: Office Admin & Close-out ✅
- **Xero Integration**: Automatic invoice creation and sync
- **Compliance Reporting**: Generate smoke alarm compliance certificates
- **Job Review**: Office review before final close-out

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- [Clerk](https://clerk.com) account (free tier is fine)
- [Cloudflare](https://cloudflare.com) account (for production: D1 database, R2 storage, Pages)
- (Optional) Xero, Twilio, Stripe, OpenRouter accounts for integrations

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/3dhuboz/Wires-R-Us.git
   cd Wires-R-Us
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials:
   - Clerk keys (required — from [Clerk Dashboard](https://dashboard.clerk.com) > API Keys)
   - Gmail OAuth credentials (required for email polling — see below)
   - OpenRouter API key (optional, enables AI email parsing)
   - Xero credentials (optional)
   - Twilio credentials (optional)
   - Stripe keys (optional)

4. **Set up Gmail OAuth for inbox polling**
   ```bash
   node scripts/get-gmail-token.cjs
   ```
   Open the URL shown in your browser, authorize access, and `GMAIL_REFRESH_TOKEN` will be written to `.env` automatically.

5. **(Development database)** The SQLite dev database (`dev.db`) is auto-created on first run.
   To seed test data: `npx tsx scripts/create-test-accounts.ts`

6. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 🔧 Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Vite
- **Backend**: Express.js (dev) / Cloudflare Pages Functions (prod)
- **Database**: Cloudflare D1 (SQLite-compatible) — better-sqlite3 in dev
- **Storage**: Cloudflare R2 (file uploads)
- **Authentication**: Clerk
- **Integrations**:
  - Xero (Accounting & Invoicing)
  - Twilio (SMS Dispatch)
  - Stripe (Billing & Subscriptions)
  - Resend (Transactional email)
  - OpenRouter (AI email parsing)
  - PDF Generation (pdf-lib)

## 📱 Key Features

- **Real-time Job Board**: Live updates across all devices
- **Role-based Access**: Dev, Admin, and User roles
- **Mobile-First Field Portal**: Optimized for electricians on-site
- **Automated Form 9**: Uses actual RTA PDF with form field population
- **Contact Attempt Tracking**: Implements three-try rule
- **Photo Upload**: Required site documentation
- **Compliance Certificates**: Auto-generated smoke alarm certificates
- **Calendar View**: Visual scheduling and dispatch
- **Team Management**: Electrician profiles and assignment

## 🔐 Security

- Clerk Authentication with JWT verification
- Role-based route protection (admin / tech / dev)
- Environment variable configuration (secrets via Cloudflare dashboard)
- API keys never exposed to client bundle

## 📦 Deployment

### Development
```bash
npm run dev
# Express server + Vite HMR at http://localhost:3000
# SQLite dev.db created automatically on first run
```

### Production (Cloudflare Pages)
```bash
# 1. Create D1 database
npx wrangler d1 create wirez-r-us-db
# Copy the database_id into wrangler.toml

# 2. Run migrations
npx wrangler d1 execute wirez-r-us-db --file=migrations/001_initial.sql
npx wrangler d1 execute wirez-r-us-db --file=migrations/002_add_indexes.sql

# 3. Create R2 bucket
npx wrangler r2 bucket create wirez-r-us-uploads

# 4a. Set build-time env vars in Cloudflare Pages dashboard
#     (Settings > Environment variables > Production)
#     VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
#     VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
#     VITE_GOOGLE_MAPS_API_KEY=AIza...

# 4b. Set runtime secrets (Workers / Functions)
npx wrangler secret put CLERK_SECRET_KEY
# ... (see wrangler.toml for full list of 13 runtime secrets)

# 5. Build & deploy
npm run build
npx wrangler pages deploy dist
```

### Email Polling Cron
Cloudflare Pages doesn't support cron triggers. Choose one of:
- **Option A**: Set up an external service (e.g. [cron-job.org](https://cron-job.org)) to POST to `/api/email/poll-inbox` every 5 minutes with `Authorization: Bearer <CRON_SECRET>`
- **Option B**: Create a separate Cloudflare Worker with `[triggers] crons = ["*/5 * * * *"]` that calls the endpoint

## 📄 License

Private - Wirez R Us Electrical Services

## 🔗 Links

- GitHub: https://github.com/3dhuboz/Wires-R-Us
- AI Studio: https://ai.studio/apps/fd3de053-9e87-4125-8a40-17adfd9ed98d
