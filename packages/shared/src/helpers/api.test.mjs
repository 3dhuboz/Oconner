import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

test('shared api helper can request a fresh auth token on 401', () => {
  assert.match(source, /interface AuthTokenOptions/);
  assert.match(source, /skipCache\?: boolean/);
  assert.match(source, /authHeaders\(\{ skipCache: true \}\)/);
  assert.match(source, /res\.status === 401/);
});
