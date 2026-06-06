import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const tracker = readFileSync(new URL('./lib/track.ts', import.meta.url), 'utf8');
const pageTracker = readFileSync(new URL('./components/PageTracker.tsx', import.meta.url), 'utf8');
const shopPage = readFileSync(new URL('./app/shop/page.tsx', import.meta.url), 'utf8');

test('storefront page tracking is production-host gated', () => {
  assert.match(tracker, /PRODUCTION_HOSTS/);
  assert.match(tracker, /oconnoragriculture\.com\.au/);
  assert.match(tracker, /\/api\/track\/pageview/);
  assert.match(tracker, /keepalive/);
});

test('page and product views are wired from the storefront', () => {
  assert.match(pageTracker, /trackPageview/);
  assert.match(pageTracker, /usePathname/);
  assert.match(shopPage, /trackItemView/);
});
