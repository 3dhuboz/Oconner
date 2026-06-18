import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./app/cart/page.tsx', import.meta.url), 'utf8');

test('cart does not calculate or display included GST for GST-free beef goods', () => {
  assert.doesNotMatch(source, /GST_RATE/);
  assert.doesNotMatch(source, /GST \(inc\.\)/);
  assert.match(source, /GST-free goods/);
  assert.match(source, /formatCurrency\(0\)/);
});
