import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./Subscriptions.tsx', import.meta.url), 'utf8');

test('subscriptions page supports paused status', () => {
  assert.match(source, /status: 'pending' \| 'active' \| 'paused' \| 'cancelled'/);
  assert.match(source, /paused: 'bg-amber-100 text-amber-700'/);
});

test('active subscriptions expose a pause action', () => {
  assert.match(source, /setStatus\(s\.id, 'paused'\)/);
  assert.match(source, /Pause/);
});

test('paused subscriptions expose a resume action', () => {
  assert.match(source, /s\.status === 'paused'/);
  assert.match(source, /setStatus\(s\.id, 'active'\)/);
  assert.match(source, /Resume/);
});
