import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const adminOrderDetailSource = readFileSync(new URL('./pages/OrderDetail.tsx', import.meta.url), 'utf8');
const accountSource = readFileSync(new URL('../../storefront/src/app/account/page.tsx', import.meta.url), 'utf8');
const trackingSource = readFileSync(new URL('../../storefront/src/app/track/[orderId]/page.tsx', import.meta.url), 'utf8');

test('admin order detail shows stored promo discounts beside order totals', () => {
  assert.match(adminOrderDetailSource, /order\.promoDiscount/);
  assert.match(adminOrderDetailSource, /Discount\{order\.promoCode/);
  assert.match(adminOrderDetailSource, /-\{formatCurrency\(order\.promoDiscount \?\? 0\)\}/);
});

test('customer order views show stored promo discounts beside order totals', () => {
  for (const source of [accountSource, trackingSource]) {
    assert.match(source, /order\.promoDiscount/);
    assert.match(source, /Discount\{order\.promoCode/);
    assert.match(source, /-\{formatCurrency\(order\.promoDiscount \?\? 0\)\}/);
  }
});
