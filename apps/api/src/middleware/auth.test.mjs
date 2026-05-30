import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./auth.ts', import.meta.url), 'utf8');

test('staff auth falls back through a linked customer Clerk ID before denying access', () => {
  assert.match(source, /import\s+\{\s*authFailures,\s*customers,\s*staffAuthLinks,\s*users\s*\}\s+from\s+'@butcher\/db'/);
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

test('staff auth can bypass Clerk with the emergency staff PIN', () => {
  assert.match(source, /X-Staff-Rescue-Pin/);
  assert.match(source, /STAFF_RESCUE_PIN/);
  assert.match(source, /rescueStaffUser/);
  assert.match(source, /findFallbackAdmin/);
  assert.match(source, /c\.set\('user', rescueUser\)/);
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

test('Clerk tokens are verified against the configured Clerk instance', () => {
  assert.match(source, /verifyToken\s+as\s+verifyClerkJwt/);
  assert.match(source, /secretKey,\s*\n\s*authorizedParties:\s*clerkAuthorizedParties/);
  assert.doesNotMatch(source, /fetch\(`\$\{iss\}\/\.well-known\/jwks\.json`\)/);
});

test('auth support codes are persisted without storing bearer tokens', () => {
  assert.match(source, /recordAuthFailure/);
  assert.match(source, /authFailures\.supportId/);
  assert.match(source, /tokenHintFromAuthHeader/);
  assert.match(source, /tokenEmails:\s*JSON\.stringify\(uniqueEmails\(failure\.tokenEmails \?\? \[\]\)\)/);
});
