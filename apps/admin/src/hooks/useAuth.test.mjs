import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./useAuth.ts', import.meta.url), 'utf8');

test('admin token provider is installed before page data effects run', () => {
  assert.match(source, /import\s+\{\s*useLayoutEffect\s*\}\s+from\s+'react'/);
  assert.match(source, /useLayoutEffect\(\(\)\s*=>\s*\{\s*setTokenProvider\(\(\)\s*=>\s*getToken\(\)\);/s);
});
