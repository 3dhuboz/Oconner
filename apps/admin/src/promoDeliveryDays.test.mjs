import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./pages/PromoCodes.tsx', import.meta.url), 'utf8');

test('promo admin loads upcoming delivery days for code restrictions', () => {
  assert.match(source, /api\.deliveryDays\.list\(true\)/);
  assert.match(source, /Eligible delivery days/);
  assert.match(source, /Leave all unticked to allow this code on every delivery day/);
});

test('promo admin sends selected delivery day ids when creating a code', () => {
  assert.match(source, /deliveryDayIds:\s*form\.deliveryDayIds/);
  assert.match(source, /toggleDeliveryDay/);
  assert.match(source, /form\.deliveryDayIds\.includes\(day\.id\)/);
});

test('promo admin can update selected delivery days on an existing code', () => {
  assert.match(source, /openRunEditor/);
  assert.match(source, /saveRunRestrictions/);
  assert.match(source, /deliveryDayIds:\s*runEditDayIds/);
  assert.match(source, /Eligible Delivery Days/);
});
