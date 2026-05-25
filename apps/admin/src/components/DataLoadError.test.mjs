import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./DataLoadError.tsx', import.meta.url), 'utf8');

test('forbidden responses are not described as stale sign-in sessions', () => {
  assert.match(source, /const isAuth = \/unauth\|401\/i\.test\(message\);/);
  assert.match(source, /const isForbidden = \/forbidden\|403\/i\.test\(message\);/);
  assert.match(source, /Admin access needs checking/);
  assert.match(source, /Reset sign-in/);
  assert.match(source, /\{isAuthLike && \(/);
});
