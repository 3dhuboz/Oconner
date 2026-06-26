import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const subscriptionsRouteSource = readFileSync(new URL('./routes/subscriptions.ts', import.meta.url), 'utf8');

test('mark-paid falls back to completed Square payments when the payment-link order stays open', () => {
  assert.match(source, /findCompletedSquarePaymentByOrderReference/);
  assert.match(source, /squareOrder\.state !== 'COMPLETED'[\s\S]+confirmOrderFromSquarePaymentMatch/);
  assert.match(source, /\/payments\?\$\{params\}/);
  assert.match(source, /ORDER #\$\{orderRef\}/);
});

test('payment lookup searches near the order date instead of paging through every later payment', () => {
  assert.match(source, /paymentSearchEnd/);
  assert.match(source, /14 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(source, /Math\.min\(paymentSearchEnd,\s*Date\.now\(\) \+ 10 \* 60 \* 1000\)/);
});

test('Square payment reconciliation records the Square payment id on the local order', () => {
  assert.match(source, /paymentIntentId:\s*match\.paymentId/);
  assert.match(source, /paymentProvider:\s*'square'/);
  assert.match(source, /matched_by=\$\{match\.matchStrategy\}/);
});

test('payment reconciliation preserves existing delivery workflow status', () => {
  assert.match(source, /function resolvePaidOrderStatus/);
  assert.match(source, /order\.status === 'pending_payment' \? 'confirmed' : order\.status/);
  assert.match(source, /status:\s*resolvePaidOrderStatus\(order\)/);
});

test('daily cron reconciles outstanding Square payment-link and invoice orders before stale cleanup', () => {
  assert.match(source, /reconcileOutstandingSquarePayments/);
  assert.match(source, /eq\(ordersTable\.paymentStatus,\s*'awaiting_payment'\)/);
  assert.match(source, /eq\(ordersTable\.paymentStatus,\s*'invoice_sent'\)/);
  assert.match(source, /Square payment link/);
  assert.doesNotMatch(source, /order\.createdAt < cutoff/);
});

test('Square invoice payments can be reconciled from the recorded invoice id', () => {
  assert.match(source, /confirmOrderFromSquareInvoiceIfPaid/);
  assert.match(source, /Square invoice sent/);
  assert.match(source, /eq\(ordersTable\.paymentStatus,\s*'invoice_sent'\)/);
  assert.match(source, /invoice\.status !== 'PAID'/);
  assert.match(source, /\/invoices\/\$\{invoiceId\}/);
  assert.match(source, /matched_by=invoice_status/);
});

test('Square payment links can reconcile through Square order metadata when payment notes are missing', () => {
  assert.match(source, /const metadata = promoCode \? \{ orderId, promoCode \} : \{ orderId \}/);
  assert.match(source, /squareOrderMetadataMatchesOrder/);
  assert.match(source, /data\.order\?\.metadata\?\.orderId === orderId/);
  assert.match(source, /matchStrategy:\s*'square_order_metadata'/);
});

test('subscription fallback payment links are tied to the local order id', () => {
  assert.match(subscriptionsRouteSource, /const orderId = await createSubscriptionOrder/);
  assert.match(subscriptionsRouteSource, /metadata:\s*\{\s*orderId,\s*subscriptionId:\s*subId\s*\}/);
  assert.match(subscriptionsRouteSource, /checkout\/success\?orderId=\$\{orderId\}/);
  assert.match(subscriptionsRouteSource, /paymentStatus:\s*'awaiting_payment'/);
  assert.match(subscriptionsRouteSource, /Square payment link:/);
  assert.match(subscriptionsRouteSource, /Order #\$\{orderId\.slice\(0,\s*8\)\.toUpperCase\(\)\}/);
});

test('Square webhooks can mark paid orders without relying on browser redirects', () => {
  assert.match(source, /app\.post\('\/api\/square\/webhook'/);
  assert.match(source, /verifySquareWebhookSignature/);
  assert.match(source, /x-square-hmacsha256-signature/);
  assert.match(source, /processedWebhooks/);
  assert.match(source, /payment\.created/);
  assert.match(source, /payment\.updated/);
  assert.match(source, /confirmOrderFromSquarePayment\(db,\s*payment,\s*c\.env\)/);
});

test('admins can trigger a Square reconciliation without waiting for the daily cron', () => {
  assert.match(source, /app\.post\('\/api\/square\/reconcile'/);
  assert.match(source, /requireRole\('admin'\)/);
  assert.match(source, /c\.req\.query\('limit'\)/);
  assert.match(source, /deepSearch = c\.req\.query\('deep'\) === 'true'/);
  assert.match(source, /reconcileOutstandingSquarePayments\(c\.env,\s*\{\s*limit,\s*deepSearch\s*\}\)/);
});

test('manual Square reconciliation is bounded and uses fast payment-link checks first', () => {
  assert.match(source, /interface SquareReconcileOptions/);
  assert.match(source, /Math\.min\(options\.limit \?\? 25,\s*100\)/);
  assert.match(source, /confirmOrderFromSquarePaymentLinkIfPaid\(db,\s*order,\s*env\)/);
  assert.match(source, /if \(options\.deepSearch \|\| direct\.squareState\)/);
});

test('Square-paid delivery orders ensure a manifest stop exists', () => {
  assert.match(source, /async function ensureStopForPaidDeliveryOrder/);
  assert.doesNotMatch(source, /order\.fulfillmentType !== 'delivery'/);
  assert.match(source, /day\.type !== 'delivery'/);
  assert.match(source, /db\.insert\(stopsTable\)\.values/);
  assert.match(source, /await ensureStopForPaidDeliveryOrder\(db,\s*order\)/);
});

test('deep Square reconciliation falls back to recent payout entries', () => {
  assert.match(source, /reconcileRecentSquarePayoutPayments/);
  assert.match(source, /listRecentSquarePayoutPaymentIds/);
  assert.match(source, /\/payouts\?\$\{payoutParams\}/);
  assert.match(source, /\/payouts\/\$\{payout\.id\}\/payout-entries\?\$\{entryParams\}/);
  assert.match(source, /squarePaymentIdFromPayoutEntry/);
  assert.match(source, /\/payments\/\$\{paymentId\}/);
  assert.match(source, /confirmOrderFromSquarePayment\(db,\s*paymentResp\.payment,\s*env\)/);
});

test('deep Square reconciliation also scans recent completed payments before payout settlement', () => {
  assert.match(source, /reconcileRecentSquarePayments/);
  assert.match(source, /listRecentSquarePaymentIds/);
  assert.match(source, /\/payments\?\$\{params\}/);
  assert.match(source, /payment\.status === 'COMPLETED'/);
  assert.match(source, /Date\.now\(\) - 3 \* DAY_MS/);
  assert.match(source, /Date\.now\(\) - 7 \* DAY_MS/);
  assert.match(source, /reconcileRecentSquarePayments\(db,\s*env,\s*directLookbackStart\)/);
  assert.match(source, /reconcileRecentSquarePayoutPayments\(db,\s*env,\s*payoutLookbackStart\)/);
});
