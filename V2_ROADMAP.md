# Wirez R Us — V2 Feature Roadmap

## Status Legend
- ✅ Already built (V1)
- 🔧 Partially built, needs enhancement
- 🆕 New feature required
- ⏳ Depends on another feature

---

## Phase 1: Core Pipeline (Week 1-2)
*Get the basic email→job→invoice→close flow bulletproof*

### 1.1 Email-to-Job Pipeline 🔧
- ✅ CloudMailin catch-all receives emails
- ✅ AI agent (GPT-4o-mini) extracts fields from any PM software format
- ✅ Admin review panel with confidence scoring
- 🆕 **Duplicate detection**: before creating a job, check if an active (non-CLOSED) job exists at the same address. If yes, flag it and offer merge option instead of creating a new job.
- 🆕 **Follow-up email handling**: if a follow-up email arrives for an existing active job at the same address, attach it as a note to the existing job rather than creating a new one.
- 🆕 **Mark email as processed**: add `emailProcessed: true` flag visible in admin so they know the app has "read" it.
- 🔧 **Env var setup**: OPENAI_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY, WEBHOOK_AUTH_EMAIL/PASSWORD must be set on Vercel.

### 1.2 Form 9 Auto-Generation 🔧
- ✅ Form 9 PDF generation exists (from RTA template)
- 🆕 **Auto-generate on job creation** — no 3-contact rule, generate immediately.
- 🆕 **2-hour window** — Form 9 should specify a 2hr attendance window, not a specific time.
- 🆕 **SA jobs**: auto-send Form 9 to tenant on creation.
- 🆕 **Non-SA jobs**: Form 9 generated but NOT auto-sent. Admin clicks "Send Form 9" when ready.

### 1.3 Stripe Connection 🔧
- ✅ Payment links exist (create-payment-link API)
- ✅ Stripe webhook updates payment status
- 🆕 **Invoice generation from job** — field tech can generate and send invoice from phone.
- 🆕 **Line items from job materials + labour hours** → auto-populate invoice.

---

## Phase 2: Smoke Alarm (SA) Check Workflow (Week 2-3)
*The client's bread-and-butter — needs to be seamless*

### 2.1 SA Route Optimisation 🆕
- Cluster SA check jobs by geographic proximity.
- Plan most efficient route (Google Maps Directions API).
- **15 min per standard SA check**, **30 min per faulty alarm**.
- Auto-schedule jobs into time slots along the route.
- Auto-book date/time to suit the route, not individual jobs.

### 2.2 SA Tenant Communications 🆕
- On schedule: auto-email + SMS tenant with booked date/time.
- Day before: reminder email + SMS.
- 1 hour before: reminder email + SMS.
- **3 automated touchpoints per job.**

### 2.3 SA Compliance Report 🆕
- Generate compliance report with customer details.
- **Propagate from previous**: if we've done an SA check at this address before, pre-fill smoke alarm type, location, and count from the last compliance report.
- Fields remain editable (tech can change on-site if needed).
- On "Close Job" → auto-email compliance report to the customer (PM).

### 2.4 Property History Database 🆕
- Store all completed jobs per property address.
- Search by address → see all previous jobs, photos, compliance reports.
- SA compliance reports linked to address for future pre-fill.

---

## Phase 3: Tenant Communication Engine (Week 3-4)
*Automated SMS/email with 2-way interaction*

### 3.1 Schedule Confirmation 🆕
- Admin clicks "Schedule" → locks date/time → adds to calendar.
- Auto-sends email + SMS to tenant: "Your appointment is booked for [date] [time]."

### 3.2 Reminder Cascade 🆕
- Day before: email + SMS reminder.
- 1 hour before: email + SMS reminder.
- Both SA and non-SA jobs.

### 3.3 SMS Reply Handling (Y/N) 🆕
- Tenant replies **Y** → confirmed, no action.
- Tenant replies **N** → notification to admin to reschedule.
- After **N**: auto-send follow-up: "If you're not available to be home, do you give consent for us to collect keys from the Real Estate Agent? Please also ensure no dogs are left unrestrained."
- If still **N** → auto-remove from calendar, move job back to "To Be Scheduled", highlight for admin.

### 3.4 Running Late Detection 🆕
- If current job overruns estimated time, detect based on job timer.
- Alert admin: "You're likely to be late to the next job at [address] booked for [time]."
- Option to auto-adjust reminder to tenant with updated ETA.
- If tech hasn't finished and next job is due, prompt: "Send delay notification to tenant?"

---

## Phase 4: Field Tech Enhancements (Week 4-5)
*Make the on-site experience faster and more complete*

### 4.1 Job Completion Checklist 🆕
- On "Complete Job" → popup checklist:
  - [ ] Photos added?
  - [ ] All parts/materials listed?
  - [ ] Hours confirmed?
  - [ ] Everything tested and working?
- **Block completion if missing** (with override button + reason).
- Prevents incomplete jobs from being closed.

### 4.2 Finish Job Button 🔧
- ✅ Status change to REVIEW/CLOSED exists.
- 🆕 **On Finish**: auto-email invoice (all jobs) or compliance report (SA jobs) to customer.
- 🆕 Eliminates need for admin to manually send documents.
- 🆕 Photos attached to invoice email.

### 4.3 Pause/Resume Job 🆕
- "Finished for Today" button → pauses timer, saves progress.
- Job moves to **PAUSED** status (new status).
- Auto-flagged for reschedule — appears highlighted on Job Board.
- Prevents jobs from "going missing" — admin sees PAUSED jobs prominently.

### 4.4 Field Invoicing 🆕
- Generate invoice directly from phone.
- Auto-populate: materials (from parts list), labour hours (from timer), misc charges.
- Barcode scanner: scan item → look up in Xero/parts catalog → add to job.
- If barcode doesn't exist, option to add barcode to item in Xero for future scans.
- Send invoice to customer email on the spot.

---

## Phase 5: Xero / Supplier Integration (Week 5-6)
*Cost tracking and pricing intelligence*

### 5.1 Xero Invoice Integration 🔧
- ✅ Xero OAuth connection exists.
- 🆕 Push invoices to Xero from the app.
- 🆕 Capture cost price from supplier invoices uploaded to Xero.

### 5.2 Rexel Product Integration 🆕
- Link Rexel product catalog to parts database.
- Capture cost prices from Rexel/Xero invoices.
- **Price change notifications**: if a part's cost price changes from the last invoice, send in-app notification.
- Admin can adjust quotes/invoice prices accordingly.

### 5.3 Barcode Management 🆕
- Add barcodes to items in Xero if supplier doesn't provide one.
- Barcode → product lookup for field scanning.
- Save to local parts database for offline use.

---

## What Already Works (V1)
- ✅ Firebase real-time job management
- ✅ Job Board with Kanban columns
- ✅ Priority/urgency colour coding + sorting
- ✅ Real-time new job notifications (toast + browser)
- ✅ Email-to-job AI parsing (needs env vars configured)
- ✅ Admin AI review panel with confidence scores
- ✅ Form 9 PDF generation
- ✅ Field portal (photos, materials, notes)
- ✅ Stripe payment links
- ✅ SMS dispatch to electricians
- ✅ Xero OAuth settings
- ✅ Work order HTML template (downloadable)
- ✅ Team management
- ✅ Calendar view
- ✅ Live map
- ✅ Tech dashboard
