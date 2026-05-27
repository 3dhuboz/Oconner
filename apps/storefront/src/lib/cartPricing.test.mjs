import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const cartSource = readFileSync(new URL('./cart.ts', import.meta.url), 'utf8');
const cartPageSource = readFileSync(new URL('../app/cart/page.tsx', import.meta.url), 'utf8');
const checkoutPageSource = readFileSync(new URL('../app/checkout/page.tsx', import.meta.url), 'utf8');

test('cart store can reprice persisted items from live product data', () => {
  assert.match(cartSource, /syncPrices:\s*\(products:\s*Product\[\]\)\s*=>\s*void/);
  assert.match(cartSource, /function calculateLineTotal/);
  assert.match(cartSource, /const productMap = new Map\(products\.map/);
  assert.match(cartSource, /fixedPrice:\s*product\.fixedPrice/);
  assert.match(cartSource, /lineTotal:\s*calculateLineTotal\(repriced\)/);
});

test('cart quantity changes recalculate from weight and price instead of stored totals', () => {
  assert.match(cartSource, /weightKg = item\.weight \? item\.weight \/ 1000 : \(item\.weightKg \?\? 1\)/);
  assert.match(cartSource, /Math\.round\(pricePerKg \* weightKg \* quantity\)/);
  assert.match(cartSource, /lineTotal:\s*calculateLineTotal\(\{ \.\.\.i, quantity \}\)/);
});

test('cart and checkout pages refresh stored cart prices before customers proceed', () => {
  assert.match(cartPageSource, /api\.products\.list\(true\)[\s\S]+syncPrices/);
  assert.match(checkoutPageSource, /api\.products\.list\(true\)[\s\S]+syncPrices/);
  assert.match(cartPageSource, /hasInvalidPricing/);
  assert.match(checkoutPageSource, /hasInvalidPricing/);
  assert.match(checkoutPageSource, /disabled=\{[\s\S]*hasInvalidPricing[\s\S]*priceSyncing[\s\S]*\}/);
});
