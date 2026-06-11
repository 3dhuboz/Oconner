import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const chatSource = readFileSync(new URL('./app/api/chat/route.ts', import.meta.url), 'utf8');
const analyseSource = readFileSync(new URL('./app/api/analyse/route.ts', import.meta.url), 'utf8');

test('storefront AI routes use a current OpenRouter model id', () => {
  assert.match(chatSource, /model:\s*'google\/gemini-3\.1-flash-lite'/);
  assert.match(analyseSource, /model:\s*'google\/gemini-3\.1-flash-lite'/);
  assert.doesNotMatch(chatSource + analyseSource, /google\/gemini-2\.0-flash-001/);
});
