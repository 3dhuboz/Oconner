import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const ordersRouteSource = readFileSync(new URL('./routes/orders.ts', import.meta.url), 'utf8');

test('public storefront Square payment links carry stored promo discounts into Square', () => {
  assert.match(indexSource, /const promoDiscount = Math\.max\(0,\s*order\.promoDiscount \?\? 0\)/);
  assert.match(indexSource, /discounts:\s*promoDiscount > 0 \? \[/);
  assert.match(indexSource, /type:\s*'FIXED_AMOUNT'/);
  assert.match(indexSource, /amount_money:\s*\{ amount: promoDiscount, currency: 'AUD' \}/);
});

test('authenticated Square payment links also carry stored promo discounts into Square', () => {
  assert.match(ordersRouteSource, /const promoDiscount = Math\.max\(0,\s*order\.promoDiscount \?\? 0\)/);
  assert.match(ordersRouteSource, /discounts:\s*promoDiscount > 0 \? \[/);
  assert.match(ordersRouteSource, /type:\s*'FIXED_AMOUNT'/);
  assert.match(ordersRouteSource, /amount_money:\s*\{ amount: promoDiscount, currency: 'AUD' \}/);
});
