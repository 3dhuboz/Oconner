import express from "express";
import { createServer as createViteServer } from "vite";
import { XeroClient } from "xero-node";
import twilio from "twilio";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { requireStripe } from "./src/services/stripe.ts";
import { PDFDocument } from "pdf-lib";
import { format } from "date-fns";
import Database from "better-sqlite3";
import fs from "fs";
import emailWebhookHandler from "./api/webhooks/email.ts";
import pollInboxHandler from "./api/email/poll-inbox.ts";
import xeroPricingHandler from "./api/xero/pricing.ts";
import xeroImportCsvHandler from "./api/xero/import-csv.ts";
import stripeCreatePaymentLinkHandler from "./api/stripe/create-payment-link.ts";
import stripeWebhookHandler from "./api/stripe/webhook.ts";
import sendTenantHandler from "./api/notifications/send-tenant.ts";
import jobsSyncHandler from "./api/jobs/sync.ts";
import schedulingRunningLateHandler from "./api/scheduling/running-late-check.ts";
import schedulingOptimiseHandler from "./api/scheduling/optimise-route.ts";
import dataJobsHandler from "./api/data/jobs.ts";
import dataElectriciansHandler from "./api/data/electricians.ts";
import dataPartsHandler from "./api/data/parts.ts";
import dataProfilesHandler from "./api/data/profiles.ts";
import dataTenantsHandler from "./api/data/tenants.ts";
import dataLocationsHandler from "./api/data/locations.ts";
import dataStockHandler from "./api/data/stock.ts";
import dataSettingsHandler from "./api/data/settings.ts";
import storageUploadHandler from "./api/storage/upload.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ── SQLite / D1 dev setup ───────────────────────────────────────────────────
// Creates a D1-compatible wrapper around better-sqlite3 so all api/data/* handlers
// work identically in dev (SQLite file) and prod (Cloudflare D1).
const DB_PATH = path.resolve('./dev.db');
const sqliteDb = new Database(DB_PATH);
sqliteDb.pragma('journal_mode = WAL');

// Run migrations
const migration = fs.readFileSync(path.resolve('./migrations/001_initial.sql'), 'utf8');
migration.split(';').map(s => s.trim()).filter(Boolean).forEach(stmt => {
  try { sqliteDb.prepare(stmt).run(); } catch { /* table exists */ }
});

// D1-compatible wrapper over better-sqlite3
const devDb = {
  prepare(sql: string) {
    const stmt = sqliteDb.prepare(sql);
    return {
      bind(...params: any[]) {
        return {
          all: async () => ({ results: stmt.all(...params) }),
          first: async () => stmt.get(...params) ?? null,
          run: async () => {
            const info = stmt.run(...params);
            return { success: true, meta: { last_row_id: info.lastInsertRowid, changes: info.changes } };
          },
        };
      },
    };
  },
};

// Helper: wrap an api handler with the dev DB in req.env
function withDb(handler: Function) {
  return async (req: any, res: any) => {
    req.env = { DB: devDb };
    await handler(req, res);
  };
}

// In a real production app, these would be stored in a database linked to the user's session.
let xeroTokenSet: any = null;
let xeroTenantId: string | null = null;

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize Xero Client
  const xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID || 'dummy_client_id',
    clientSecret: process.env.XERO_CLIENT_SECRET || 'dummy_client_secret',
    redirectUris: [
      process.env.APP_URL 
        ? `${process.env.APP_URL}/api/auth/xero/callback` 
        : `http://localhost:${PORT}/api/auth/xero/callback`
    ],
    scopes: 'openid profile email accounting.transactions accounting.contacts offline_access'.split(' ')
  });

  // --- DATA API (Cloudflare D1 in prod / SQLite in dev) ---
  app.all("/api/data/jobs", withDb(dataJobsHandler));
  app.all("/api/data/electricians", withDb(dataElectriciansHandler));
  app.all("/api/data/parts", withDb(dataPartsHandler));
  app.all("/api/data/profiles", withDb(dataProfilesHandler));
  app.all("/api/data/tenants", withDb(dataTenantsHandler));
  app.all("/api/data/locations", withDb(dataLocationsHandler));
  app.all("/api/data/stock", withDb(dataStockHandler));
  app.all("/api/data/settings", withDb(dataSettingsHandler));
  app.all("/api/storage/upload", withDb(storageUploadHandler));

  // --- API ROUTES ---

  // 1. Get Xero Auth URL
  app.get("/api/auth/xero/url", async (req, res) => {
    try {
      if (!process.env.XERO_CLIENT_ID) {
        return res.status(400).json({ error: "XERO_CLIENT_ID is not configured in environment variables." });
      }
      const consentUrl = await xero.buildConsentUrl();
      res.json({ url: consentUrl });
    } catch (e: any) {
      console.error("Error building Xero URL:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Xero OAuth Callback
  app.get("/api/auth/xero/callback", async (req, res) => {
    try {
      const url = req.url;
      const tokenSet = await xero.apiCallback(url);
      await xero.updateTenants();
      
      xeroTokenSet = tokenSet;
      xeroTenantId = xero.tenants[0].tenantId;
      
      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, window.location.origin);
                window.close();
              } else {
                window.location.href = '/integrations';
              }
            </script>
            <p>Xero Authentication successful! This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (e: any) {
      console.error("Xero Callback Error:", e);
      res.status(500).send(`Authentication Error: ${e.message}`);
    }
  });

  // 3. Check Xero Connection Status
  app.get("/api/xero/status", (req, res) => {
    res.json({ connected: !!xeroTokenSet });
  });

  // 4. Create Invoice in Xero
  app.post("/api/xero/invoice", async (req, res) => {
    if (!xeroTokenSet || !xeroTenantId) {
      return res.status(401).json({ error: "Not connected to Xero. Please connect in Integrations first." });
    }

    try {
      await xero.setTokenSet(xeroTokenSet);
      const { job } = req.body;
      
      // Build the Xero Invoice object
      const lineItems = job.materials.map((m: any) => ({
        description: m.name,
        quantity: m.quantity,
        unitAmount: m.cost,
        accountCode: '200' // Standard Sales Account in Xero
      }));

      // Add labor if recorded
      if (job.laborHours) {
        lineItems.push({
          description: 'Electrical Labor',
          quantity: job.laborHours,
          unitAmount: 85.00, // Example hourly rate
          accountCode: '200'
        });
      }

      const invoice = {
        type: 'ACCREC' as const,
        contact: {
          name: job.tenantName || 'Wirez R Us Customer'
        },
        lineItems,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], // Net 14
        reference: `Job: ${job.id}`,
        status: 'DRAFT' as const
      };

      const response = await xero.accountingApi.createInvoices(xeroTenantId, { invoices: [invoice as any] });
      
      res.json({ 
        success: true, 
        invoiceId: response.body.invoices?.[0]?.invoiceID,
        invoiceNumber: response.body.invoices?.[0]?.invoiceNumber
      });
    } catch (e: any) {
      console.error("Xero Invoice Error:", e);
      res.status(500).json({ error: e.message || "Failed to create invoice in Xero" });
    }
  });

  // --- EMAIL INBOX MONITORING ---

  // 5. Inbound email webhook (CloudMailIn / SendGrid Inbound Parse)
  app.post("/api/webhooks/email", withDb(emailWebhookHandler));
  app.get("/api/webhooks/email", withDb(emailWebhookHandler));

  // 5b. Gmail polling endpoint (mirrors Cloudflare Cron — call GET or POST to trigger)
  app.get("/api/email/poll-inbox", withDb(pollInboxHandler));
  app.post("/api/email/poll-inbox", withDb(pollInboxHandler));

  // 5c. Email test (no dedicated handler — simulate)
  app.post("/api/email/test", (req, res) => {
    const { to, provider } = req.body || {};
    console.log(`[Email Test] Simulated send to: ${to} via ${provider || 'default'}`);
    res.json({ success: true, simulated: true, message: `Test email simulated to ${to} (configure SMTP/SendGrid for real sends)` });
  });

  // 5d. Jobs sync (serverless stub)
  app.get("/api/jobs/sync", async (req, res) => {
    await jobsSyncHandler(req as any, res as any);
  });

  // --- SMS DISPATCH (TWILIO) ---
  
  // 7. Send SMS to Electrician
  app.post("/api/sms/send", async (req, res) => {
    const { to, message } = req.body;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !from) {
      // Simulate success if not configured
      console.log(`[SMS Simulation] To: ${to} | Message: ${message}`);
      return res.json({ success: true, simulated: true });
    }

    try {
      const client = twilio(sid, token);
      await client.messages.create({ body: message, from, to });
      console.log(`[SMS Sent] To: ${to}`);
      res.json({ success: true, simulated: false });
    } catch (e: any) {
      console.error("Twilio Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // 7b. Test SMS from Integrations page
  app.post("/api/sms/test", async (req, res) => {
    const { to, provider, accountSid, authToken, phoneNumber, fromNumber } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Missing "to" phone number' });
    }

    // Use request body credentials first, fall back to env vars
    // Frontend sends 'fromNumber', accept both field names for safety
    const sid = accountSid || process.env.TWILIO_ACCOUNT_SID;
    const token = authToken || process.env.TWILIO_AUTH_TOKEN;
    const from = fromNumber || phoneNumber || process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !from) {
      console.log(`[SMS Test Simulation] To: ${to} | Provider: ${provider || 'twilio'}`);
      return res.json({ success: true, simulated: true, message: `Test SMS simulated to ${to} (no Twilio credentials configured)` });
    }

    try {
      const client = twilio(sid, token);
      const msg = await client.messages.create({
        body: `Wirez R Us — SMS gateway test. If you received this, your SMS integration is working correctly.`,
        from,
        to,
      });
      console.log(`[SMS Test] Sent to: ${to} | SID: ${msg.sid}`);
      res.json({ success: true, simulated: false, sid: msg.sid });
    } catch (e: any) {
      console.error("[SMS Test] Twilio error:", e.message);
      res.status(500).json({ error: e.message || 'Failed to send test SMS' });
    }
  });

  // --- STRIPE BILLING & LICENSING ---

  // 8. Get active subscription plans
  app.get("/api/stripe/plans", async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({ plans: [], simulated: true });
    }
    try {
      const prices = await requireStripe().prices.list({
        active: true,
        expand: ['data.product'],
      });
      res.json({ plans: prices.data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 9. Create a checkout session
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    const { priceId } = req.body;
    try {
      const session = await requireStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/billing?success=true`,
        cancel_url: `${process.env.APP_URL}/billing?canceled=true`,
      });
      res.json({ sessionId: session.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 10. Stripe Webhook Handler
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = requireStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.sendStatus(400);
    }

    // Handle the event (production handler is api/stripe/webhook.ts which updates D1)
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('[Stripe] Payment successful for session:', event.data.object.id);
        break;
      case 'charge.refunded':
        console.log('[Stripe] Charge refunded:', event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        console.log('[Stripe] Payment failed:', event.data.object.id);
        break;
      default:
        console.log(`[Stripe] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // 11. Generate Form 9 PDF (server-side to avoid CORS issues)
  app.post("/api/form9/generate", async (req, res) => {
    try {
      const { tenantName, propertyAddress, tenantEmail, propertyManagerEmail, proposedEntryDate, jobId } = req.body;

      if (!proposedEntryDate) {
        return res.status(400).json({ error: "Proposed entry date is required" });
      }

      // Fetch the actual RTA Form 9 PDF
      const formUrl = 'https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-9-Entry-notice.pdf';
      const pdfResponse = await fetch(formUrl);
      
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch Form 9 PDF from RTA');
      }

      const existingPdfBytes = await pdfResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Fill the actual Form 9 fields
      try {
        form.getTextField('Name/s of tenant/s').setText(tenantName || '');
        form.getTextField('Address1').setText(propertyAddress || '');
        form.getTextField('Address of rental property 4').setText(propertyAddress || '');
        
        form.getCheckBox('Other authorised person (secondary agent)').check();
        form.getTextField('Full name or trading name 1').setText('Wirez R Us (Contractor)');
        form.getTextField('Full name or trading name 2').setText('Wirez R Us Technician');
        
        const today = new Date();
        form.getTextField('Day 1').setText(format(today, 'EEEE'));
        form.getTextField('Date (dd/mm/yyyy)1').setText(format(today, 'dd/MM/yyyy'));
        form.getTextField('Method of issue 1').setText('Email');
        
        const entryDateObj = new Date(proposedEntryDate);
        form.getTextField('Day 2').setText(format(entryDateObj, 'EEEE'));
        form.getTextField('Date (dd/mm/yyyy) 2').setText(format(entryDateObj, 'dd/MM/yyyy'));
        
        const timeFrom = format(entryDateObj, 'hh:mm a');
        const timeTo = format(new Date(entryDateObj.getTime() + 2 * 3600 * 1000), 'hh:mm a');
        
        form.getTextField('Time of entry').setText(timeFrom);
        form.getTextField('Two hour period from').setText(timeFrom);
        form.getTextField('Two hour period to').setText(timeTo);
        
        form.getCheckBox('Checkbox3').check();
        
        form.getTextField('Print name').setText('Wirez R Us');
        form.getTextField('Date of signature (dd/mm/yyyy)').setText(format(today, 'dd/MM/yyyy'));
      } catch (e) {
        console.warn("Could not fill some form fields", e);
      }

      const pdfBytes = await pdfDoc.save();

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Form9_${jobId || 'download'}.pdf"`);
      res.send(Buffer.from(pdfBytes));

      console.log(`[Form 9] Generated for job ${jobId}`);
    } catch (error: any) {
      console.error("Error generating Form 9:", error);
      res.status(500).json({ error: error.message || "Failed to generate Form 9 PDF" });
    }
  });

  // --- ADDITIONAL API ROUTES (from /api folder) ---

  // Xero: pricing catalog (GET/POST/PATCH)
  app.all("/api/xero/pricing", withDb(xeroPricingHandler));

  // Xero: import CSV
  app.post("/api/xero/import-csv", withDb(xeroImportCsvHandler));

  // Xero: disconnect (clear session token)
  app.post("/api/xero/disconnect", (req, res) => {
    xeroTokenSet = null;
    xeroTenantId = null;
    res.json({ success: true });
  });

  // Stripe: create payment link
  app.post("/api/stripe/create-payment-link", async (req, res) => {
    await stripeCreatePaymentLinkHandler(req as any, res as any);
  });

  // Stripe: webhook (production handler with D1 update)
  app.post("/api/stripe/webhook-v2", express.raw({ type: 'application/json' }), withDb(stripeWebhookHandler));

  // Notifications: send tenant SMS/email
  app.post("/api/notifications/send-tenant", async (req, res) => {
    await sendTenantHandler(req as any, res as any);
  });

  // Scheduling
  app.all("/api/scheduling/running-late-check", async (req, res) => {
    await schedulingRunningLateHandler(req as any, res as any);
  });
  app.all("/api/scheduling/optimise-route", async (req, res) => {
    await schedulingOptimiseHandler(req as any, res as any);
  });

  // --- VITE & SERVING LOGIC ---

  if (process.env.NODE_ENV === 'production') {
    // In production, serve the built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    // SPA fallback: send index.html for any other requests
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In development, use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
