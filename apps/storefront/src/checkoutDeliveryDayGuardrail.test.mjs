import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./app/checkout/page.tsx', import.meta.url), 'utf8');

test('checkout keeps delivery-day options visible before postcode entry', () => {
  assert.doesNotMatch(source, /!\s*postcodeEntered\s*\?\s*\(/);
  assert.match(source, /Choose a delivery day, then enter your address above/);
});

test('checkout defaults to a delivery run before pickup when one exists', () => {
  assert.match(source, /const defaultDay = days\.find\(\(d\) => \(d as any\)\.type !== 'pickup'\) \?\? days\[0\]/);
});

test('checkout requires a complete delivery address before order creation', () => {
  assert.match(source, /Please enter your delivery address, suburb and 4-digit postcode/);
  assert.match(source, /!\s*form\.line1\.trim\(\)/);
  assert.match(source, /!\s*\/\^\\d\{4\}\$\/\.test\(form\.postcode\.trim\(\)\)/);
});
