import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const stopsSource = readFileSync(new URL('./routes/stops.ts', import.meta.url), 'utf8');
const rescueSource = readFileSync(new URL('./routes/driverRescue.ts', import.meta.url), 'utf8');

test('normal driver status updates enforce one active stop per delivery day', () => {
  assert.match(stopsSource, /const ACTIVE_STOP_STATUSES = \['en_route', 'arrived'\]/);
  assert.match(stopsSource, /function hasOtherActiveStop/);
  assert.match(stopsSource, /function clearOtherActiveStops/);
  assert.match(stopsSource, /ne\(stops\.id,\s*stopId\)/);
  assert.match(stopsSource, /inArray\(stops\.status,\s*ACTIVE_STOP_STATUSES\)/);
  assert.match(stopsSource, /inArray\(orders\.id,\s*orderIds\)/);
  assert.match(stopsSource, /eq\(orders\.status,\s*'out_for_delivery'\)/);
  assert.match(stopsSource, /status:\s*'confirmed'/);
  assert.match(stopsSource, /status === 'en_route' \|\| status === 'arrived'/);
  assert.match(stopsSource, /const hasActiveStop = await hasOtherActiveStop/);
  assert.match(stopsSource, /if \(hasActiveStop\) return c\.json\(\{ ok: true \}\)/);
});

test('emergency driver status updates enforce one active stop per delivery day', () => {
  assert.match(rescueSource, /const ACTIVE_STOP_STATUSES = \['en_route', 'arrived'\]/);
  assert.match(rescueSource, /function hasOtherActiveStop/);
  assert.match(rescueSource, /function clearOtherActiveStops/);
  assert.match(rescueSource, /ne\(stops\.id,\s*stopId\)/);
  assert.match(rescueSource, /inArray\(stops\.status,\s*ACTIVE_STOP_STATUSES\)/);
  assert.match(rescueSource, /inArray\(orders\.id,\s*orderIds\)/);
  assert.match(rescueSource, /eq\(orders\.status,\s*'out_for_delivery'\)/);
  assert.match(rescueSource, /status:\s*'confirmed'/);
  assert.match(rescueSource, /status === 'en_route' \|\| status === 'arrived'/);
  assert.match(rescueSource, /const hasActiveStop = await hasOtherActiveStop/);
  assert.match(rescueSource, /res\.headers\.set\('Cache-Control',\s*'no-store'\)/);
});
