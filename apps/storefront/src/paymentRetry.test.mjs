import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const checkoutSource = readFileSync(new URL('./app/checkout/page.tsx', import.meta.url), 'utf8');
const accountSource = readFileSync(new URL('./app/account/page.tsx', import.meta.url), 'utf8');

test('checkout does not show success when Square payment-link creation fails', () => {
  assert.match(checkoutSource, /pendingPaymentOrderId/);
  assert.match(checkoutSource, /openSquareCheckout/);
  assert.match(checkoutSource, /Open Square checkout/);
  assert.doesNotMatch(checkoutSource, /router\.push\(`\/checkout\/success/);
});

test('account order history offers a payment retry for unpaid orders', () => {
  assert.match(accountSource, /payForOrder/);
  assert.match(accountSource, /api\.orders\.createPaymentLink\(orderId\)/);
  assert.match(accountSource, /\['pending_payment', 'awaiting_payment'\]\.includes\(order\.paymentStatus\)/);
  assert.match(accountSource, /Pay now/);
});
