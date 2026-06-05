import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./pages/Dashboard.tsx', import.meta.url), 'utf8');

test('dashboard separates awaiting Square payment attempts from paid order stats', () => {
  assert.match(source, /awaitingPayment/);
  assert.match(source, /setAwaitingOrders\(awaitingPayment\.slice\(0,\s*5\)\)/);
  assert.match(source, /Awaiting Square Payment/);
  assert.match(source, /not yet confirmed by Square/);
  assert.match(source, /paymentStatus/);
});
