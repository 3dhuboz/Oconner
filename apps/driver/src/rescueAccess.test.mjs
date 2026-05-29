import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const loginSource = readFileSync(new URL('./pages/Login.tsx', import.meta.url), 'utf8');
const stopsSource = readFileSync(new URL('./pages/Stops.tsx', import.meta.url), 'utf8');
const detailSource = readFileSync(new URL('./pages/StopDetail.tsx', import.meta.url), 'utf8');
const rescueSource = readFileSync(new URL('./lib/rescue.ts', import.meta.url), 'utf8');

test('driver app has a Clerk-independent rescue access path', () => {
  assert.match(rescueSource, /ocn-driver-rescue-pin/);
  assert.match(rescueSource, /X-Driver-Rescue-Pin/);
  assert.match(appSource, /hasRescueAccess\(\)/);
  assert.match(loginSource, /Emergency driver access/);
  assert.match(loginSource, /rescueApi\.today\(cleaned\)/);
});

test('rescue mode can load and update live stops without Clerk', () => {
  assert.match(stopsSource, /rescueApi\.today\(rescuePin\)/);
  assert.match(stopsSource, /isRescueMode/);
  assert.match(detailSource, /rescueApi\.stop\(stopId\)/);
  assert.match(detailSource, /rescueApi\.updateStatus/);
  assert.match(detailSource, /Photo upload is unavailable in emergency mode/);
});
