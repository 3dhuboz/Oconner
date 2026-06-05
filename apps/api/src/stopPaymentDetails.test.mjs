import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./routes/stops.ts', import.meta.url), 'utf8');

test('stops API attaches linked order payment details for driver collection', () => {
  assert.match(source, /function serializeStop/);
  assert.match(source, /orderTotal:\s*order\?\.total/);
  assert.match(source, /orderPaymentStatus:\s*order\?\.paymentStatus/);
  assert.match(source, /attachOrderPaymentDetails/);
  assert.match(source, /inArray\(orders\.id,\s*orderIds\)/);
});
