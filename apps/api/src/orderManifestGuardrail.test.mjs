import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ordersRouteSource = readFileSync(new URL('./routes/orders.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('paid delivery orders create a stop from admin and Square confirmation paths', () => {
  assert.match(ordersRouteSource, /async function ensureStopForPaidDeliveryOrder/);
  assert.match(ordersRouteSource, /order\.fulfillmentType !== 'delivery'/);
  assert.match(ordersRouteSource, /day\.type !== 'delivery'/);
  assert.match(ordersRouteSource, /paymentStatus === 'paid'[\s\S]+ensureStopForPaidDeliveryOrder/);
  assert.match(ordersRouteSource, /effectiveOrder\.paymentStatus === 'paid'[\s\S]+ensureStopForPaidDeliveryOrder/);

  assert.match(indexSource, /async function ensureStopForPaidDeliveryOrder/);
  assert.match(indexSource, /await ensureStopForPaidDeliveryOrder\(db,\s*order\)/);
});
