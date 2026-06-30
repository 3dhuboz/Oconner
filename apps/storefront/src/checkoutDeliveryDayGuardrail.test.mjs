import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./app/checkout/page.tsx', import.meta.url), 'utf8');

test('checkout keeps delivery-day options visible before postcode entry', () => {
  assert.doesNotMatch(source, /!\s*postcodeEntered\s*\?\s*\(/);
  assert.match(source, /Choose a delivery day, then enter your address above/);
});

test('checkout does not hide tomorrow runs with a rolling 24-hour cutoff', () => {
  assert.doesNotMatch(source, /Date\.now\(\)\s*\+\s*86_400_000/);
  assert.doesNotMatch(source, /d\.date\s*<\s*tomorrow/);
});

test('checkout delivery-day option labels stay ASCII-safe', () => {
  assert.match(source, /Delivery: /);
  assert.match(source, /Pickup: /);
  assert.doesNotMatch(source, /ð|Ã|Â/);
});

test('checkout defaults to a delivery run before pickup when one exists', () => {
  assert.match(source, /const defaultDay = days\.find\(\(d\) => \(d as any\)\.type !== 'pickup'\) \?\? days\[0\]/);
});

test('checkout hides stock-pooled days when a cart item is not allocated', () => {
  assert.match(source, /const alloc = d\.stockAvailability!\.find\(\(s\) => s\.productId === item\.productId\)/);
  assert.match(source, /return alloc === undefined \|\| alloc\.remaining < qty/);
});

test('checkout explains when cart items are not available on the same run', () => {
  assert.match(source, /No delivery days are available for everything in your cart/);
  assert.match(source, /Some specials and add-ons are only packed for specific runs/);
});

test('checkout requires a complete delivery address before order creation', () => {
  assert.match(source, /Please enter your delivery address, suburb and 4-digit postcode/);
  assert.match(source, /!\s*form\.line1\.trim\(\)/);
  assert.match(source, /!\s*\/\^\\d\{4\}\$\/\.test\(form\.postcode\.trim\(\)\)/);
});
