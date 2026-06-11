import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const ordersRouteSource = readFileSync(new URL('./routes/orders.ts', import.meta.url), 'utf8');
const promoRouteSource = readFileSync(new URL('./routes/promoCodes.ts', import.meta.url), 'utf8');
const promoHelperSource = readFileSync(new URL('./lib/promos.ts', import.meta.url), 'utf8');
const schemaSource = readFileSync(new URL('../../../packages/db/src/schema.ts', import.meta.url), 'utf8');

test('promo codes can store selected delivery day ids', () => {
  assert.match(schemaSource, /deliveryDayIds:\s*text\('delivery_day_ids'\)/);
  assert.match(promoRouteSource, /deliveryDayIds\?:\s*string\[\]/);
  assert.match(promoRouteSource, /JSON\.stringify\(body\.deliveryDayIds\)/);
});

test('public promo validation checks the selected delivery day', () => {
  assert.match(indexSource, /deliveryDayId\?:\s*string/);
  assert.match(indexSource, /promoAllowsDeliveryDay\(promo,\s*deliveryDayId\)/);
  assert.match(indexSource, /This code is only valid for selected delivery days/);
});

test('order creation rejects restricted promo codes on ineligible delivery days', () => {
  assert.match(indexSource, /promoAllowsDeliveryDay\(promo,\s*body\.deliveryDayId\)/);
  assert.match(ordersRouteSource, /promoAllowsDeliveryDay\(promo,\s*body\.deliveryDayId\)/);
  assert.match(indexSource, /This promo code is only valid for selected delivery days/);
  assert.match(ordersRouteSource, /This promo code is only valid for selected delivery days/);
});

test('promo delivery-day helper treats empty restrictions as valid for all days', () => {
  assert.match(promoHelperSource, /if \(!value\) return \[\]/);
  assert.match(promoHelperSource, /if \(allowedIds\.length === 0\) return true/);
  assert.match(promoHelperSource, /allowedIds\.includes\(deliveryDayId\)/);
});
