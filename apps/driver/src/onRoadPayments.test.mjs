import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const detailSource = readFileSync(new URL('./pages/StopDetail.tsx', import.meta.url), 'utf8');
const apiSource = readFileSync(new URL('../../../packages/shared/src/helpers/api.ts', import.meta.url), 'utf8');
const deliveryTypesSource = readFileSync(new URL('../../../packages/shared/src/types/delivery.ts', import.meta.url), 'utf8');

test('driver stop detail can launch and refresh Square on-road payments', () => {
  assert.match(detailSource, /Take payment/);
  assert.match(detailSource, /api\.orders\.createPaymentLink\(stop\.orderId\)/);
  assert.match(detailSource, /api\.orders\.markPaid\(stop\.orderId\)/);
  assert.match(detailSource, /Refresh payment/);
  assert.match(detailSource, /Payments are disabled in emergency mode/);
});

test('shared stop and API types expose linked order payment fields', () => {
  assert.match(deliveryTypesSource, /orderTotal\?: number/);
  assert.match(deliveryTypesSource, /orderPaymentStatus\?: PaymentStatus/);
  assert.match(apiSource, /createPaymentLink/);
  assert.match(apiSource, /markPaid/);
});
