import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

test('API deploy script always uses the local Wrangler config', () => {
  assert.match(pkg.scripts.deploy, /wrangler deploy --config wrangler\.toml/);
});
