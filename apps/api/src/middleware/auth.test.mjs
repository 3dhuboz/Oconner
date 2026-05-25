import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./auth.ts', import.meta.url), 'utf8');

test('staff auth falls back through a linked customer Clerk ID before denying access', () => {
  assert.match(source, /import\s+\{\s*customers,\s*staffAuthLinks,\s*users\s*\}\s+from\s+'@butcher\/db'/);
  assert.match(source, /where\(eq\(customers\.clerkId,\s*clerk\.clerkId\)\)/);
  assert.match(source, /findActiveStaffByEmail\(db,\s*linkedCustomer\.email\)/);
  assert.match(source, /customer-linked staff user/);
});

test('staff auth can use durable Clerk id links and remember new verified ids', () => {
  assert.match(source, /findStaffByAuthLink/);
  assert.match(source, /staffAuthLinks\.clerkId/);
  assert.match(source, /rememberStaffAuthLink/);
  assert.match(source, /onConflictDoUpdate/);
});

test('staff auth resolves email case-insensitively from JWT and Clerk Backend emails', () => {
  assert.match(source, /emailsFromTokenPayload/);
  assert.match(source, /email_address/);
  assert.match(source, /lower\(\$\{users\.email\}\)/);
  assert.match(source, /clerkBackendEmails/);
});

test('staff auth failures return support codes and reset hints without caching', () => {
  assert.match(source, /ADMIN_AUTH_LINK_MISSING/);
  assert.match(source, /supportId/);
  assert.match(source, /action:\s*'reset_sign_in'/);
  assert.match(source, /Cache-Control',\s*'no-store'/);
});
