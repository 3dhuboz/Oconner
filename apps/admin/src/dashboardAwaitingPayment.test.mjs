import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./pages/Dashboard.tsx', import.meta.url), 'utf8');

test('dashboard keeps unpaid Square checkout attempts out of owner-facing stats', () => {
  assert.match(source, /const paidOrders = allOrders\.filter/);
  assert.match(source, /paymentStatus === 'paid'/);
  assert.doesNotMatch(source, /Awaiting Square Payment/);
  assert.doesNotMatch(source, /not yet confirmed by Square/);
  assert.doesNotMatch(source, /Sync Square/);
  assert.doesNotMatch(source, /awaitingPayment/);
  assert.doesNotMatch(source, /setSyncingSquare/);
});
