import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('public visitor tracker stores privacy-safe production events', () => {
  assert.match(source, /app\.post\('\/api\/track\/pageview'/);
  assert.match(source, /TRACK_PROD_HOSTS/);
  assert.match(source, /TRACK_BOT_UA_RE/);
  assert.match(source, /sessionHash/);
  assert.match(source, /pageEvents/);
  assert.match(source, /referrerHost/);
  assert.match(source, /deviceType/);
});

test('admin insights endpoint exposes heartbeat and useful dimensions', () => {
  assert.match(source, /app\.get\('\/api\/insights'/);
  assert.match(source, /lastEventAt/);
  assert.match(source, /topPages/);
  assert.match(source, /topItems/);
  assert.match(source, /recentSessions/);
  assert.match(source, /referrer_host/);
  assert.match(source, /device_type/);
});
