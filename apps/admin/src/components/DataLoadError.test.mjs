import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./DataLoadError.tsx', import.meta.url), 'utf8');

test('forbidden responses are not described as stale sign-in sessions', () => {
  assert.match(source, /const isAuth = details\?\.status === 401 \|\| \/unauth\|401\/i\.test\(message\);/);
  assert.match(source, /const isForbidden = details\?\.status === 403 \|\| \/forbidden\|403\/i\.test\(message\);/);
  assert.match(source, /Admin access needs checking/);
  assert.match(source, /Reset sign-in/);
  assert.match(source, /\{\(isAuthLike \|\| error\.resetRecommended\) && \(/);
});

test('auth errors show support codes and reset hints from the API', () => {
  assert.match(source, /supportId\?: string/);
  assert.match(source, /resetRecommended/);
  assert.match(source, /Support code:/);
  assert.match(source, /action === 'reset_sign_in'/);
});
