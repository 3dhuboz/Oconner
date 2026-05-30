import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

test('production admin builds are pinned to the live Clerk key', () => {
  assert.match(source, /productionPublishableKey\s*=\s*'pk_live_/);
  assert.match(source, /publishableKey\s*=\s*productionPublishableKey/);
  assert.doesNotMatch(source, /import\.meta\.env\.VITE_CLERK_PUBLISHABLE_KEY/);
  assert.match(source, /Production admin must use the live Clerk publishable key/);
});
