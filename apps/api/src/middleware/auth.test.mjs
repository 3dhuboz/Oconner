import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./auth.ts', import.meta.url), 'utf8');

test('staff auth falls back through a linked customer Clerk ID before denying access', () => {
  assert.match(source, /import\s+\{\s*customers,\s*users\s*\}\s+from\s+'@butcher\/db'/);
  assert.match(source, /where\(eq\(customers\.clerkId,\s*clerk\.clerkId\)\)/);
  assert.match(source, /where\(eq\(users\.email,\s*linkedCustomer\.email\)\)/);
  assert.match(source, /customer-linked staff user/);
});
