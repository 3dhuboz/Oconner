import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const layoutSource = readFileSync(new URL('./app/layout.tsx', import.meta.url), 'utf8');
const bannerSource = readFileSync(new URL('./components/AnnouncementBanner.tsx', import.meta.url), 'utf8');

test('storefront renders editable announcement banner globally', () => {
  assert.match(layoutSource, /<AnnouncementBanner \/>/);
  assert.match(bannerSource, /api\.config\.get\('announcementBanner'\)/);
  assert.match(bannerSource, /banner\.enabled/);
  assert.match(bannerSource, /banner\.linkUrl/);
  assert.match(bannerSource, /banner\.linkLabel/);
  assert.match(bannerSource, /backgroundColor/);
  assert.match(bannerSource, /textColor/);
  assert.match(bannerSource, /style=\{style\}/);
});
