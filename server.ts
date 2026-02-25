import express from "express";
import { createServer as createViteServer } from "vite";
import { XeroClient } from "xero-node";
import twilio from "twilio";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { stripe } from "./src/services/stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// In a real production app, these would be stored in a database linked to the user's session.
// For this live preview, we store them in memory.
let xeroTokenSet: any = null;
let xeroTenantId: string | null = null;
let inboundJobsQueue: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

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
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
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

      const response = await xero.accountingApi.createInvoices(xeroTenantId, { invoices: [invoice] });
      
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

  // --- EMAIL INBOX MONITORING (WEBHOOK) ---
  
  // 5. Receive Inbound Email (e.g., from SendGrid Inbound Parse or Zapier)
  app.post("/api/webhooks/email", (req, res) => {
    const { subject, text, from, tenantName, tenantPhone, address } = req.body;
    
    // In a real app, you would parse the email body text to extract the address and tenant details.
    // Here we use the provided fields or fallback to placeholders.
    const newJob = {
      id: `WRU-${Math.floor(1000 + Math.random() * 9000)}`,
      title: subject || 'New Work Order from Email',
      type: subject?.toLowerCase().includes('smoke') ? 'SMOKE_ALARM' : 'GENERAL_REPAIR',
      status: 'INTAKE',
      createdAt: new Date().toISOString(),
      tenantName: tenantName || 'Unknown (Parse from email)',
      tenantPhone: tenantPhone || 'TBD',
      tenantEmail: 'TBD',
      propertyAddress: address || 'See email body',
      propertyManagerEmail: from || 'pm@example.com',
      contactAttempts: [],
      materials: [],
      photos: [],
      siteNotes: text || 'No description provided.'
    };

    inboundJobsQueue.push(newJob);
    console.log(`[Email Webhook] Received new job: ${newJob.title}`);
    res.status(200).json({ success: true, job: newJob });
  });

  // 6. Sync new jobs to frontend
  app.get("/api/jobs/sync", (req, res) => {
    const jobs = [...inboundJobsQueue];
    inboundJobsQueue = []; // Clear the queue after sending
    res.json({ jobs });
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

  // --- STRIPE BILLING & LICENSING ---

  // 8. Get active subscription plans
  app.get("/api/stripe/plans", async (req, res) => {
    try {
      const prices = await stripe.prices.list({
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
      const session = await stripe.checkout.sessions.create({
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
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.sendStatus(400);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // TODO: Fulfill the purchase, e.g., activate a license in your database
        console.log('Payment was successful for session:', session.id);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // --- VITE MIDDLEWARE & SPA FALLBACK --- 
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
  }

  // Catch-all to serve index.html for any non-API routes
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next(); // Skip API calls
    }
    const distPath = path.resolve(__dirname, "dist");
    res.sendFile(path.resolve(process.env.NODE_ENV === 'production' ? distPath : __dirname, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
