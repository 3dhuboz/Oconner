import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./app/checkout/page.tsx', import.meta.url), 'utf8');

test('checkout validates promo codes against the selected delivery day', () => {
  assert.match(source, /deliveryDayId:\s*selectedDayId/);
  assert.match(source, /\/api\/promo-codes\/validate/);
});

test('checkout revalidates an applied promo when the selected delivery day changes', () => {
  assert.match(source, /promoApplied\?\.code/);
  assert.match(source, /setPromoApplied\(null\)/);
  assert.match(source, /Promo code removed for this delivery day/);
});
