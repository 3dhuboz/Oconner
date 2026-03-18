<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ⚡ Wirez R Us - Electrical Field Management System

A complete electrical contractor workflow management system built with React, TypeScript, Firebase, and integrated with Xero, Twilio, and Stripe.

## 🎯 Customer Workflow Implementation

This system implements the complete **Wirez R Us Operational Workflow**:

### Phase 1: Intake & Coordination ✅
- **Email Monitoring**: Automatic job creation from inbound emails
- **Job Logging**: All work orders logged in Firebase CRM
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
- Firebase account
- (Optional) Xero, Twilio, Stripe accounts for integrations

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
   - Firebase configuration (required — copy from Firebase Console > Project Settings > Your apps)
   - Gmail OAuth credentials (required for email polling — see below)
   - Xero credentials (optional)
   - Twilio credentials (optional)
   - Stripe keys (optional)

4. **Set up Gmail OAuth for inbox polling**
   ```bash
   node scripts/get-gmail-token.cjs
   ```
   Open the URL shown in your browser, authorize access, and `GMAIL_REFRESH_TOKEN` will be written to `.env` automatically.

5. **(Optional) Create test accounts**
   ```bash
   npx tsx scripts/create-test-accounts.ts
   ```
   Creates `testadmin@wirez.test` and `testtech@wirez.test` (password: `TestPass123!`).

6. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 🔧 Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS, Vite
- **Backend**: Express.js, Node.js
- **Database**: Firebase Firestore (real-time)
- **Authentication**: Firebase Auth
- **Integrations**:
  - Xero (Accounting & Invoicing)
  - Twilio (SMS Dispatch)
  - Stripe (Billing & Subscriptions)
  - PDF Generation (jsPDF, pdf-lib)

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

- Firebase Authentication with custom claims
- Role-based route protection
- Environment variable configuration
- Secure API key management

## 📦 Deployment

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
The project includes `vercel.json` configuration for easy deployment.

## 🐛 Known Issues & Fixes

✅ **Fixed Issues**:
- Production start script now uses `tsx` instead of `node`
- Stripe API version updated to match package version
- Firebase Auth properly initialized in service layer
- **Email polling**: Vercel Cron calls `GET` but handler only processed `POST` — fixed
- **Email polling**: Skip patterns were filtering real estate agent emails (info@, support@, hello@) — fixed
- **Email polling**: Emails were marked as read even when Firestore save failed (lost jobs) — fixed
- All API routes now properly mounted in dev server (`server.ts`)
- Stripe `/api/stripe/plans` returns graceful empty response when key not configured

### ⚠️ Firebase Setup Notes
- **Anonymous Auth** must be enabled in Firebase Console (Authentication → Sign-in methods) for the email polling server to write jobs without `WEBHOOK_AUTH_EMAIL`
- Without Firebase credentials in `.env`, the app will show the login page but login will fail — fill all `VITE_FIREBASE_*` vars from Firebase Console > Project Settings > Your apps

## 📄 License

Private - Wirez R Us Electrical Services

## 🔗 Links

- GitHub: https://github.com/3dhuboz/Wires-R-Us
- AI Studio: https://ai.studio/apps/fd3de053-9e87-4125-8a40-17adfd9ed98d
