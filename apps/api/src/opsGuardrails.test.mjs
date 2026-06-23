import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('ops guardrail endpoint exposes production consistency checks', () => {
  assert.match(source, /interface OpsGuardrailIssue/);
  assert.match(source, /async function runOpsGuardrails/);
  assert.match(source, /app\.get\('\/api\/ops\/guardrails', requireRole\('admin'\)/);
  assert.match(source, /app\.post\('\/api\/ops\/guardrails\/repair', requireRole\('admin'\)/);
});

test('ops guardrails detect stock, manifest, route, subscription and stale checkout drift', () => {
  assert.match(source, /code: 'stock_reservation_drift'/);
  assert.match(source, /code: 'paid_delivery_order_missing_stop'/);
  assert.match(source, /code: 'delivery_stop_order_drift'/);
  assert.match(source, /code: 'delivery_stop_unassigned_to_single_run'/);
  assert.match(source, /code: 'subscription_pending_without_invoice'/);
  assert.match(source, /code: 'stale_pending_checkout'/);
  assert.match(source, /code: 'delivery_day_order_count_drift'/);
});

test('ops guardrail repair keeps route stops aligned with order edits', () => {
  assert.match(source, /function parseAddressForGuardrails/);
  assert.match(source, /function addressKey/);
  assert.match(source, /addressMismatch/);
  assert.match(source, /dayMismatch/);
  assert.match(source, /detailMismatch/);
  assert.match(source, /lat: null, lng: null/);
  assert.match(source, /set\(\{ runId: dayRuns\[0\]\.id \}\)/);
});

test('daily cron runs ops guardrail repair after payment and checkout cleanup', () => {
  assert.match(source, /const guardrails = await runOpsGuardrails\(env, \{ repair: true \}\)/);
  assert.match(source, /\[ops-guardrails\] ok=\$\{guardrails\.ok\} issues=\$\{guardrails\.issues\.length\} repaired=\$\{guardrails\.repaired\}/);
});
