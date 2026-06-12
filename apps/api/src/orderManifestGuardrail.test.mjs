import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ordersRouteSource = readFileSync(new URL('./routes/orders.ts', import.meta.url), 'utf8');
const deliveryDaysRouteSource = readFileSync(new URL('./routes/deliveryDays.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('paid delivery orders create a stop from admin and Square confirmation paths', () => {
  assert.match(ordersRouteSource, /async function ensureStopForPaidDeliveryOrder/);
  assert.match(ordersRouteSource, /day\.type !== 'delivery'/);
  assert.doesNotMatch(ordersRouteSource, /order\.fulfillmentType !== 'delivery'/);
  assert.match(ordersRouteSource, /paymentStatus === 'paid'[\s\S]+ensureStopForPaidDeliveryOrder/);
  assert.match(ordersRouteSource, /effectiveOrder\.paymentStatus === 'paid'[\s\S]+ensureStopForPaidDeliveryOrder/);

  assert.match(indexSource, /async function ensureStopForPaidDeliveryOrder/);
  assert.doesNotMatch(indexSource, /order\.fulfillmentType !== 'delivery'/);
  assert.match(indexSource, /day\.type !== 'delivery'/);
  assert.match(indexSource, /await ensureStopForPaidDeliveryOrder\(db,\s*order\)/);
});

test('paid delivery stops are assigned to a driver run when one active driver exists', () => {
  assert.match(indexSource, /async function ensureDriverRunForDeliveryDay/);
  assert.match(indexSource, /existingRuns\.length === 1/);
  assert.match(indexSource, /activeDrivers\.length !== 1/);
  assert.match(indexSource, /runId,/);

  assert.match(ordersRouteSource, /async function ensureDriverRunForDeliveryDay/);
  assert.match(ordersRouteSource, /activeDrivers\.length !== 1/);
  assert.match(ordersRouteSource, /runId,/);

  assert.match(deliveryDaysRouteSource, /single active driver with no zone split/);
  assert.match(deliveryDaysRouteSource, /isNull\(stops\.runId\)/);
});

test('public checkout orders are not fulfillable until Square confirms payment', () => {
  assert.match(indexSource, /status:\s*'pending_payment'[\s\S]+paymentStatus:\s*initialPaymentStatus/);
  assert.match(deliveryDaysRouteSource, /const FULFILLABLE_PAYMENT_STATUSES = new Set\(\['paid'\]\)/);
  assert.match(deliveryDaysRouteSource, /!FULFILLABLE_PAYMENT_STATUSES\.has\(order\.paymentStatus\)/);
});
