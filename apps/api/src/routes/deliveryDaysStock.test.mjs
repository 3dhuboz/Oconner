import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./deliveryDays.ts', import.meta.url), 'utf8');

test('delivery day stock saves validate before replacing allocation rows', () => {
  assert.match(source, /if \(!day\) return c\.json\(\{ error: 'Delivery day not found' \}, 404\)/);
  assert.match(source, /linked to a missing stock pool/);
  assert.match(source, /Stock allocation request was not valid JSON/);
  assert.match(source, /Duplicate product allocation/);
  assert.match(source, /cannot be below \$\{sold\} already sold/);
  assert.match(source, /Cannot remove \$\{existingRow\.productName\} because \$\{existingRow\.sold\} has already sold/);
});

test('delivery day stock saves keep the rewrite batched', () => {
  assert.match(source, /const statements = \[/);
  assert.match(source, /DELETE FROM delivery_day_stock WHERE delivery_day_id = \?/);
  assert.match(source, /INSERT INTO delivery_day_stock/);
  assert.match(source, /await c\.env\.DB\.batch\(statements\)/);
});

test('delivery day stock response explains reserved stock by payment state', () => {
  assert.match(source, /function buildStockPaymentBreakdown/);
  assert.match(source, /paidSold: productBreakdown\.paid/);
  assert.match(source, /awaitingPayment: productBreakdown\.awaitingPayment/);
  assert.match(source, /cancelledQty: productBreakdown\.cancelled/);
  assert.match(source, /inArray\(orders\.deliveryDayId,\s*poolDayIds\)/);
});
