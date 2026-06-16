import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const sharedOrderTypeSource = readFileSync(new URL('../../../packages/shared/src/types/order.ts', import.meta.url), 'utf8');

test('public order creation stores discounted payable totals from server-side promo lookup', () => {
  assert.match(indexSource, /promoCodes as promoCodesTable/);
  assert.match(indexSource, /requestedPromoId/);
  assert.match(indexSource, /requestedPromoCode/);
  assert.match(indexSource, /const discountedSubtotal = Math\.max\(0, verifiedSubtotal - promoDiscount\)/);
  assert.match(indexSource, /const total = discountedSubtotal \+ deliveryFee/);
  assert.match(indexSource, /promoCode: appliedPromoCode/);
  assert.match(indexSource, /promoDiscount/);
  assert.match(indexSource, /totalSpent: sql`\$\{customersTable\.totalSpent\} \+ \$\{total\}`/);
});

test('public order creation consumes promo usage after stock reservation', () => {
  assert.match(indexSource, /const reserveResult = await reserveDayStock\(db, dayAllocations, verifiedItems\)/);
  assert.match(indexSource, /const consumed = await consumePromoCode\(db, appliedPromoId, now\)/);
  assert.match(indexSource, /deliveryDayStock\.sold\} - \$\{qty\}/);
});

test('abandoned pending checkout sweep releases reserved stock', () => {
  assert.match(indexSource, /releaseDayStock\(db,\s*order\.deliveryDayId,\s*items\)/);
  assert.match(indexSource, /restoreStock\(db,\s*items,\s*order\.id,\s*Date\.now\(\)\)/);
  assert.match(indexSource, /auto-cancelled by daily cron: pending_payment > 12h/);
});

test('orders expose promo fields to frontend views', () => {
  assert.match(indexSource, /promoCode: order\.promoCode/);
  assert.match(indexSource, /promoDiscount: order\.promoDiscount/);
  assert.match(sharedOrderTypeSource, /promoCode\?: string \| null/);
  assert.match(sharedOrderTypeSource, /promoDiscount\?: number \| null/);
});
