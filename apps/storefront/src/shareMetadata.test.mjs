import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const layout = readFileSync(new URL('./app/layout.tsx', import.meta.url), 'utf8');
const siteMetadata = readFileSync(new URL('./lib/siteMetadata.ts', import.meta.url), 'utf8');
const about = readFileSync(new URL('./app/about/page.tsx', import.meta.url), 'utf8');
const deliveryDays = readFileSync(new URL('./app/delivery-days/page.tsx', import.meta.url), 'utf8');
const terms = readFileSync(new URL('./app/terms/page.tsx', import.meta.url), 'utf8');

test('storefront uses a large absolute social share card', () => {
  assert.match(siteMetadata, /siteUrl = 'https:\/\/oconnoragriculture\.com\.au'/);
  assert.match(siteMetadata, /url: `\$\{siteUrl\}\/og-card\.jpg`/);
  assert.match(siteMetadata, /width: 1200/);
  assert.match(siteMetadata, /height: 630/);
  assert.match(layout, /metadataBase: new URL\(siteUrl\)/);
  assert.match(layout, /card: 'summary_large_image'/);
  assert.doesNotMatch(layout, /card: 'summary'/);
  assert.doesNotMatch(layout, /images: \['\/oc-logo\.jpg'\]/);
});

test('share image exists and is large enough for Facebook cards', () => {
  const image = statSync(new URL('../public/og-card.jpg', import.meta.url));
  assert.ok(image.size > 100_000);
});

test('server-rendered pages declare page-specific share metadata', () => {
  assert.match(about, /pageMetadata\(\{/);
  assert.match(deliveryDays, /pageMetadata\(\{/);
  assert.match(terms, /pageMetadata\(\{/);
});
