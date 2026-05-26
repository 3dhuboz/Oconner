import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('mark-paid falls back to completed Square payments when the payment-link order stays open', () => {
  assert.match(source, /findCompletedSquarePaymentByOrderReference/);
  assert.match(source, /squareOrder\.state !== 'COMPLETED'[\s\S]+confirmOrderFromSquarePaymentMatch/);
  assert.match(source, /\/payments\?\$\{params\}/);
  assert.match(source, /ORDER #\$\{orderRef\}/);
});

test('Square payment reconciliation records the Square payment id on the local order', () => {
  assert.match(source, /paymentIntentId:\s*match\.paymentId/);
  assert.match(source, /paymentProvider:\s*'square'/);
  assert.match(source, /matched_by=payment_note/);
});

test('daily cron reconciles recent awaiting Square payment-link orders before stale cleanup', () => {
  assert.match(source, /reconcileRecentSquarePayments/);
  assert.match(source, /eq\(ordersTable\.paymentStatus,\s*'awaiting_payment'\)/);
  assert.match(source, /Square payment link/);
});

test('Square invoice payments can be reconciled from the recorded invoice id', () => {
  assert.match(source, /confirmOrderFromSquareInvoiceIfPaid/);
  assert.match(source, /Square invoice sent/);
  assert.match(source, /eq\(ordersTable\.paymentStatus,\s*'invoice_sent'\)/);
  assert.match(source, /invoice\.status !== 'PAID'/);
  assert.match(source, /\/invoices\/\$\{invoiceId\}/);
  assert.match(source, /matched_by=invoice_status/);
});
