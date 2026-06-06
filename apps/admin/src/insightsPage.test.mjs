import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync(new URL('./pages/Insights.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('./components/Layout.tsx', import.meta.url), 'utf8');

test('admin insights page consumes the authenticated insights API', () => {
  assert.match(page, /api\.get<InsightsStats>\('\/api\/insights'\)/);
  assert.match(page, /trackerHealth/);
  assert.match(page, /lastEventAt/);
  assert.match(page, /Recent Visitor Sessions/);
});

test('admin insights page has a phone-friendly layout', () => {
  assert.match(page, /RecentSessionCards/);
  assert.match(page, /md:hidden/);
  assert.match(page, /hidden overflow-x-auto md:block/);
  assert.match(page, /min-w-\[520px\]/);
  assert.match(page, /min-w-0 rounded-lg border bg-white shadow-sm/);
  assert.match(page, /sm:text-2xl/);
});

test('insights route is available from the admin navigation', () => {
  assert.match(app, /path="insights"/);
  assert.match(layout, /to: '\/insights'/);
  assert.match(layout, /label: 'Insights'/);
});
