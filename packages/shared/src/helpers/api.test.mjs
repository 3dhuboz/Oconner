import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

test('shared api helper can request a fresh auth token on auth failures', () => {
  assert.match(source, /interface AuthTokenOptions/);
  assert.match(source, /skipCache\?: boolean/);
  assert.match(source, /authHeaders\(\{ skipCache: true \}\)/);
  assert.match(source, /res\.status === 401 \|\| res\.status === 403/);
});

test('shared api helper preserves structured auth failure details', () => {
  assert.match(source, /export class ApiError extends Error/);
  assert.match(source, /supportId\?: string/);
  assert.match(source, /action\?: string/);
  assert.match(source, /cache:\s*'no-store'/);
});

test('shared api helper can attach the emergency staff PIN', () => {
  assert.match(source, /ocn-admin-rescue-pin/);
  assert.match(source, /getStaffRescuePin/);
  assert.match(source, /saveStaffRescuePin/);
  assert.match(source, /X-Staff-Rescue-Pin/);
});

test('image uploads use the same auth and retry path as JSON requests', () => {
  assert.match(source, /images:\s*\{/);
  assert.match(source, /await authHeaders\(\)/);
  assert.match(source, /authHeaders\(\{ skipCache: true \}\)/);
  assert.doesNotMatch(source, /headers:\s*\{\s*Authorization:\s*headers\.Authorization \?\? ''\s*\}/);
  assert.match(source, /throw new ApiError\(err\.error \?\? `Upload failed \(HTTP \$\{res\.status\}\)`/);
});
