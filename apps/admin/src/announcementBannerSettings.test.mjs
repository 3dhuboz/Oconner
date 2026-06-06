import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./pages/Settings.tsx', import.meta.url), 'utf8');

test('admin settings can edit the global site promo banner', () => {
  assert.match(source, /interface AnnouncementBannerConfig/);
  assert.match(source, /ANNOUNCEMENT_DEFAULTS/);
  assert.match(source, /announcementBanner/);
  assert.match(source, /Site Promo Banner/);
  assert.match(source, /api\.config\.update\(\{[\s\S]*announcementBanner/);
  assert.match(source, /15% off store wide - use code TWINS15/);
});
