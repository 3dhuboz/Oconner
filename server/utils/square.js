const { Client } = require('square');
const SiteSettings = require('../models/SiteSettings');

let squareClient = null;
let cachedSettings = null;
let settingsCacheTime = 0;
const CACHE_TTL = 60000; // Re-read DB settings every 60s

async function loadSquareSettings() {
  const now = Date.now();
  if (cachedSettings && (now - settingsCacheTime) < CACHE_TTL) return cachedSettings;
  try {
    const settings = await SiteSettings.getSettings();
    cachedSettings = {
      accessToken: settings.squareAccessToken || process.env.SQUARE_ACCESS_TOKEN || '',
      locationId: settings.squareLocationId || process.env.SQUARE_LOCATION_ID || '',
      environment: settings.squareEnvironment || process.env.SQUARE_ENVIRONMENT || 'sandbox'
    };
    settingsCacheTime = now;
  } catch (err) {
    console.error('[Square] Failed to load settings from DB:', err.message);
    cachedSettings = {
      accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
      locationId: process.env.SQUARE_LOCATION_ID || '',
      environment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
    };
  }
  return cachedSettings;
}

// Call this to force re-read from DB (e.g. after saving settings)
function invalidateSquareCache() {
  squareClient = null;
  cachedSettings = null;
  settingsCacheTime = 0;
}

async function getSquareClient() {
  const settings = await loadSquareSettings();
  
  if (!settings.accessToken) {
    console.warn('[Square] No Square Access Token configured — Square features disabled');
    return null;
  }

  // Rebuild client if token or environment changed
  if (squareClient && squareClient._accessToken === settings.accessToken && squareClient._env === settings.environment) {
    return squareClient;
  }

  squareClient = new Client({
    accessToken: settings.accessToken,
    environment: settings.environment === 'production' ? 'production' : 'sandbox'
  });
  // Tag for change detection
  squareClient._accessToken = settings.accessToken;
  squareClient._env = settings.environment;

  return squareClient;
}

async function getLocationId() {
  const settings = await loadSquareSettings();
  return settings.locationId;
}

// ══════════════════════════════════════════════
// Square Customers
// ══════════════════════════════════════════════

async function findOrCreateSquareCustomer({ email, firstName, lastName, company, phone }) {
  const client = await getSquareClient();
  if (!client) return null;

  try {
    // Search for existing customer
    const searchRes = await client.customersApi.searchCustomers({
      query: {
        filter: {
          emailAddress: { exact: email }
        }
      }
    });

    if (searchRes.result.customers?.length > 0) {
      return searchRes.result.customers[0];
    }

    // Create new customer
    const createRes = await client.customersApi.createCustomer({
      emailAddress: email,
      givenName: firstName || '',
      familyName: lastName || '',
      companyName: company || '',
      phoneNumber: phone || '',
      referenceId: email,
      note: 'Created by Penny Wise I.T platform'
    });

    return createRes.result.customer;
  } catch (err) {
    console.error('[Square] Customer error:', err.message || err);
    return null;
  }
}

// ══════════════════════════════════════════════
// Square Invoices
// ══════════════════════════════════════════════

async function createSquareInvoice({ squareCustomerId, lineItems, dueDate, title, invoiceNumber, branding }) {
  const client = await getSquareClient();
  if (!client) return null;

  const locationId = await getLocationId();
  if (!locationId) {
    console.error('[Square] No SQUARE_LOCATION_ID configured');
    return null;
  }

  try {
    // First create an order
    const orderLineItems = lineItems.map(item => ({
      name: item.description,
      quantity: String(item.quantity || 1),
      basePriceMoney: {
        amount: BigInt(Math.round(item.unitPrice * 100)), // Square uses cents
        currency: 'AUD'
      }
    }));

    const orderRes = await client.ordersApi.createOrder({
      order: {
        locationId,
        lineItems: orderLineItems,
        state: 'OPEN'
      },
      idempotencyKey: `order-${invoiceNumber}-${Date.now()}`
    });

    const orderId = orderRes.result.order.id;

    // Create the invoice
    const invoiceRes = await client.invoicesApi.createInvoice({
      invoice: {
        locationId,
        orderId,
        primaryRecipient: {
          customerId: squareCustomerId
        },
        paymentRequests: [{
          requestType: 'BALANCE',
          dueDate: dueDate ? new Date(dueDate).toISOString().split('T')[0] : undefined,
          automaticPaymentSource: 'NONE',
          reminders: [
            { relativeScheduledDays: -3, message: `Reminder: Your invoice from ${branding?.businessName || 'Penny Wise I.T'} is due in 3 days.` },
            { relativeScheduledDays: 0, message: `Your invoice from ${branding?.businessName || 'Penny Wise I.T'} is due today.` },
            { relativeScheduledDays: 7, message: `Your invoice from ${branding?.businessName || 'Penny Wise I.T'} is now overdue.` }
          ]
        }],
        deliveryMethod: 'EMAIL',
        invoiceNumber: invoiceNumber || undefined,
        title: title || 'Invoice',
        description: `Invoice from ${branding?.businessName || 'Penny Wise I.T'}`,
        acceptedPaymentMethods: {
          card: true,
          squareGiftCard: false,
          bankAccount: true,
          buyNowPayLater: false,
          cashAppPay: false
        }
      },
      idempotencyKey: `inv-${invoiceNumber}-${Date.now()}`
    });

    return {
      invoice: invoiceRes.result.invoice,
      orderId
    };
  } catch (err) {
    console.error('[Square] Create invoice error:', JSON.stringify(err.result?.errors || err.message || err));
    return null;
  }
}

async function publishSquareInvoice(squareInvoiceId, version) {
  const client = await getSquareClient();
  if (!client) return null;

  try {
    const res = await client.invoicesApi.publishInvoice(squareInvoiceId, {
      version: version || 0,
      idempotencyKey: `pub-${squareInvoiceId}-${Date.now()}`
    });
    return res.result.invoice;
  } catch (err) {
    console.error('[Square] Publish invoice error:', JSON.stringify(err.result?.errors || err.message || err));
    return null;
  }
}

async function cancelSquareInvoice(squareInvoiceId, version) {
  const client = await getSquareClient();
  if (!client) return null;

  try {
    const res = await client.invoicesApi.cancelInvoice(squareInvoiceId, {
      version: version || 0
    });
    return res.result.invoice;
  } catch (err) {
    console.error('[Square] Cancel invoice error:', JSON.stringify(err.result?.errors || err.message || err));
    return null;
  }
}

async function getSquareInvoice(squareInvoiceId) {
  const client = await getSquareClient();
  if (!client) return null;

  try {
    const res = await client.invoicesApi.getInvoice(squareInvoiceId);
    return res.result.invoice;
  } catch (err) {
    console.error('[Square] Get invoice error:', err.message || err);
    return null;
  }
}

module.exports = {
  getSquareClient,
  getLocationId,
  invalidateSquareCache,
  findOrCreateSquareCustomer,
  createSquareInvoice,
  publishSquareInvoice,
  cancelSquareInvoice,
  getSquareInvoice
};
