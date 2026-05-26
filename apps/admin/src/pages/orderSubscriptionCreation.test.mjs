import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./Orders.tsx', import.meta.url), 'utf8');

test('manual order subscription flow does not ask the API to create a second first order', () => {
  assert.match(source, /skipInitialOrder:\s*true/);
  assert.match(source, /firstOrderDeliveryDayId:\s*form\.deliveryDayId/);
});
