import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const stopsSource = readFileSync(new URL('./routes/stops.ts', import.meta.url), 'utf8');
const rescueSource = readFileSync(new URL('./routes/driverRescue.ts', import.meta.url), 'utf8');
const subscriptionsSource = readFileSync(new URL('./routes/subscriptions.ts', import.meta.url), 'utf8');
const deliveryDaysSource = readFileSync(new URL('./routes/deliveryDays.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const subscriptionHelperSource = readFileSync(new URL('./lib/subscriptions.ts', import.meta.url), 'utf8');

test('driver stop status updates require linked orders to be paid before fulfilment', () => {
  assert.match(stopsSource, /status === 'en_route' \|\| status === 'arrived' \|\| status === 'delivered'/);
  assert.match(stopsSource, /linkedOrder\?\.paymentStatus !== 'paid'/);
  assert.match(stopsSource, /Payment must be marked paid before this delivery can continue\./);
  assert.match(stopsSource, /function findNextDeliverableStop/);
  assert.match(stopsSource, /isDeliverableLinkedOrder\(linkedOrder\)/);
  assert.match(stopsSource, /paymentStatus: orders\.paymentStatus/);
  assert.match(stopsSource, /NON_DELIVERABLE_ORDER_STATUSES/);

  assert.match(rescueSource, /status === 'en_route' \|\| status === 'arrived' \|\| status === 'delivered'/);
  assert.match(rescueSource, /linkedOrder\?\.paymentStatus !== 'paid'/);
  assert.match(rescueSource, /Payment must be marked paid before this delivery can continue\./);
  assert.match(rescueSource, /function findNextDeliverableStop/);
  assert.match(rescueSource, /isDeliverableLinkedOrder\(linkedOrder\)/);
  assert.match(rescueSource, /paymentStatus: orders\.paymentStatus/);
  assert.match(rescueSource, /NON_DELIVERABLE_ORDER_STATUSES/);
});

test('subscription generation no longer forces unpaid orders into fulfilment', () => {
  assert.doesNotMatch(subscriptionsSource, /forceStatus:\s*'confirmed'/);
  assert.doesNotMatch(deliveryDaysSource, /forceStatus:\s*'confirmed'/);
  assert.doesNotMatch(indexSource, /forceStatus:\s*'confirmed'/);
  assert.doesNotMatch(subscriptionHelperSource, /forceStatus/);
  assert.match(subscriptionHelperSource, /const orderStatus = paymentStatus === 'paid' \? 'confirmed' : 'pending_payment'/);
  assert.match(subscriptionHelperSource, /createAndPublishSquareInvoiceForOrder/);
  assert.match(subscriptionHelperSource, /paymentStatus === 'pending_payment'/);
  assert.match(subscriptionHelperSource, /Square invoice failed:/);
});
