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

test('insights route is available from the admin navigation', () => {
  assert.match(app, /path="insights"/);
  assert.match(layout, /to: '\/insights'/);
  assert.match(layout, /label: 'Insights'/);
});
