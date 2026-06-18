import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./lib/subscriptions.ts', import.meta.url), 'utf8');

test('subscription-generated orders are GST-free', () => {
  assert.doesNotMatch(source, /opts\.price\s*\/\s*11/);
  assert.match(source, /const gst = 0/);
  assert.match(source, /const subtotal = opts\.price/);
});
