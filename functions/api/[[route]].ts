/**
 * Cloudflare Pages Functions — catch-all for all /api/* routes.
 * In production this file is compiled and deployed alongside the static frontend.
 * In development, server.ts (Express) handles all routes instead.
 *
 * Bindings required in wrangler.toml:
 *   [[d1_databases]] binding = "DB"
 *   [[r2_buckets]]   binding = "R2"
 */

import { fromCfRequest, makeCfResponse } from '../../api/_handler';
import { isPublicRoute, verifyClerkJwt } from '../../api/_auth';

// ─── Data CRUD handlers ────────────────────────────────────────
import dataJobsHandler        from '../../api/data/jobs';
import dataElectriciansHandler from '../../api/data/electricians';
import dataPartsHandler       from '../../api/data/parts';
import dataProfilesHandler    from '../../api/data/profiles';
import dataTenantsHandler     from '../../api/data/tenants';
import dataLocationsHandler   from '../../api/data/locations';
import dataStockHandler       from '../../api/data/stock';
import dataSettingsHandler    from '../../api/data/settings';
import storageUploadHandler   from '../../api/storage/upload';

// ─── Email / inbox ─────────────────────────────────────────────
import emailWebhookHandler    from '../../api/webhooks/email';
import pollInboxHandler       from '../../api/email/poll-inbox';

// ─── Xero ──────────────────────────────────────────────────────
import xeroPricingHandler     from '../../api/xero/pricing';
import xeroImportCsvHandler   from '../../api/xero/import-csv';
import xeroInvoiceHandler     from '../../api/xero/invoice';
import xeroStatusHandler      from '../../api/xero/status';
import xeroDisconnectHandler  from '../../api/xero/disconnect';
import xeroAuthUrlHandler     from '../../api/auth/xero/url';
import xeroAuthCallbackHandler from '../../api/auth/xero/callback';

// ─── Stripe ────────────────────────────────────────────────────
import stripeWebhookHandler           from '../../api/stripe/webhook';
import stripeCreatePaymentLinkHandler from '../../api/stripe/create-payment-link';
import stripeCreateCheckoutHandler    from '../../api/stripe/create-checkout-session';
import stripePlansHandler             from '../../api/stripe/plans';

// ─── SMS / notifications ───────────────────────────────────────
import smsSendHandler         from '../../api/sms/send';
import smsTestHandler         from '../../api/sms/test';
import sendTenantHandler      from '../../api/notifications/send-tenant';

// ─── Scheduling ────────────────────────────────────────────────
import schedulingLateHandler  from '../../api/scheduling/running-late-check';
import schedulingOptHandler   from '../../api/scheduling/optimise-route';

// ─── Misc ──────────────────────────────────────────────────────
import form9Handler           from '../../api/form9/generate';

// ─── Route table: path prefix → handler ────────────────────────
// Longer/more-specific paths must come before shorter prefixes.
const ROUTES: Array<{ path: string; handler: Function; exact?: boolean }> = [
  // Data
  { path: '/api/data/jobs',         handler: dataJobsHandler },
  { path: '/api/data/electricians', handler: dataElectriciansHandler },
  { path: '/api/data/parts',        handler: dataPartsHandler },
  { path: '/api/data/profiles',     handler: dataProfilesHandler },
  { path: '/api/data/tenants',      handler: dataTenantsHandler },
  { path: '/api/data/locations',    handler: dataLocationsHandler },
  { path: '/api/data/stock',        handler: dataStockHandler },
  { path: '/api/data/settings',     handler: dataSettingsHandler },
  { path: '/api/storage/upload',    handler: storageUploadHandler },
  // Email
  { path: '/api/webhooks/email',    handler: emailWebhookHandler },
  { path: '/api/email/poll-inbox',  handler: pollInboxHandler },
  { path: '/api/email/test',        handler: (_req: any, res: any) => res.json({ success: true, simulated: true }) },
  // Xero
  { path: '/api/auth/xero/callback', handler: xeroAuthCallbackHandler },
  { path: '/api/auth/xero/url',      handler: xeroAuthUrlHandler },
  { path: '/api/xero/import-csv',    handler: xeroImportCsvHandler },
  { path: '/api/xero/pricing',       handler: xeroPricingHandler },
  { path: '/api/xero/invoice',       handler: xeroInvoiceHandler },
  { path: '/api/xero/status',        handler: xeroStatusHandler },
  { path: '/api/xero/disconnect',    handler: xeroDisconnectHandler },
  // Stripe
  { path: '/api/stripe/webhook-v2',              handler: stripeWebhookHandler },
  { path: '/api/stripe/webhook',                 handler: stripeWebhookHandler },
  { path: '/api/stripe/create-payment-link',     handler: stripeCreatePaymentLinkHandler },
  { path: '/api/stripe/create-checkout-session', handler: stripeCreateCheckoutHandler },
  { path: '/api/stripe/plans',                   handler: stripePlansHandler },
  // SMS / notifications
  { path: '/api/sms/send',                       handler: smsSendHandler },
  { path: '/api/sms/test',                       handler: smsTestHandler },
  { path: '/api/notifications/send-tenant',      handler: sendTenantHandler },
  // Scheduling
  { path: '/api/scheduling/running-late-check',  handler: schedulingLateHandler },
  { path: '/api/scheduling/optimise-route',      handler: schedulingOptHandler },
  // Misc
  { path: '/api/form9/generate', handler: form9Handler },
];

interface Env {
  DB: any;
  R2: any;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  [key: string]: any;
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;

  // Inject CF Worker env bindings (secrets/vars) into process.env so handlers
  // using process.env work correctly in production (nodejs_compat makes it writable).
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string' && !process.env[k]) process.env[k] = v;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Match route (exact first, then prefix)
  const match = ROUTES.find(r => pathname === r.path || pathname.startsWith(r.path + '/'));

  if (!match) {
    return new Response(JSON.stringify({ error: `No handler for ${pathname}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify Clerk JWT for protected routes
  if (!isPublicRoute(pathname)) {
    const userId = await verifyClerkJwt(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Convert CF request → AppRequest, inject D1/R2 bindings
  const appEnv = { DB: env.DB, R2: env.R2, ...env };
  // Stripe webhooks require the exact raw body string for signature verification
  const rawBody = pathname.includes('/api/stripe/webhook') ? await request.text() : undefined;
  const appReq = await fromCfRequest(request, appEnv, rawBody);
  const { res, getResponse } = makeCfResponse();

  try {
    await match.handler(appReq, res);
  } catch (err: any) {
    console.error(`[Worker] Error in ${pathname}:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return getResponse();
};
