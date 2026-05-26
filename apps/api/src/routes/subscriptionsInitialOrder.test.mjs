import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./subscriptions.ts', import.meta.url), 'utf8');

test('admin-created subscriptions can skip the automatic first order', () => {
  assert.match(source, /skipInitialOrder\?:\s*boolean/);
  assert.match(source, /firstOrderDeliveryDayId\?:\s*string/);
  assert.match(source, /if \(!body\.skipInitialOrder && customerId && body\.address && orderPrice\)/);
});

test('skipping the first order records the manual delivery date as the last generated point', () => {
  assert.match(source, /manualFirstOrderGeneratedAt/);
  assert.match(source, /lastOrderGeneratedAt:\s*manualFirstOrderGeneratedAt/);
});
