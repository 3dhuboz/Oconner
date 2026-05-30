import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const routeSource = readFileSync(new URL('./routes/adminRescue.ts', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const typesSource = readFileSync(new URL('./types.ts', import.meta.url), 'utf8');

test('admin rescue creates protected one-time Clerk sign-in links', () => {
  assert.match(typesSource, /STAFF_RESCUE_PIN\?:\s*string/);
  assert.match(routeSource, /X-Staff-Rescue-Pin/);
  assert.match(routeSource, /https:\/\/api\.clerk\.com\/v1\/sign_in_tokens/);
  assert.match(routeSource, /strategy.*ticket|sign_in_tokens/);
  assert.match(routeSource, /sendSms\(c\.env,\s*to/);
  assert.match(indexSource, /app\.route\('\/api\/admin-rescue',\s*adminRescueRouter\)/);
  assert.match(indexSource, /app\.route\('\/api\/admin-rescue'[\s\S]+app\.use\('\/api\/\*', requireAuth\)/);
});

test('admin rescue exposes a Clerk-independent staff session check', () => {
  assert.match(routeSource, /app\.post\('\/session'/);
  assert.match(routeSource, /requireStaffRescuePin/);
  assert.match(routeSource, /oconnoragriculture@gmail\.com/);
  assert.match(routeSource, /Cache-Control',\s*'no-store'/);
});
