import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

test('production driver builds are pinned to the live Clerk key', () => {
  assert.match(source, /productionPublishableKey\s*=\s*'pk_live_/);
  assert.match(source, /publishableKey\s*=\s*productionPublishableKey/);
  assert.doesNotMatch(source, /import\.meta\.env\.VITE_CLERK_PUBLISHABLE_KEY/);
  assert.match(source, /Production driver app must use the live Clerk publishable key/);
});

test('driver app actively updates the PWA shell on refresh', () => {
  assert.match(source, /registerSW\(\{/);
  assert.match(source, /immediate:\s*true/);
  assert.match(source, /registration\.update\(\)/);
  assert.match(source, /onNeedRefresh\(\)/);
  assert.match(source, /updateServiceWorker\(true\)/);
});
