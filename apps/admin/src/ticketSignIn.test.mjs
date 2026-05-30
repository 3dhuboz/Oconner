import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./pages/TicketSignIn.tsx', import.meta.url), 'utf8');
const loginSource = readFileSync(new URL('./pages/Login.tsx', import.meta.url), 'utf8');

test('admin has a one-time ticket sign-in route for staff rescue', () => {
  assert.match(appSource, /path="\/ticket"/);
  assert.match(pageSource, /strategy:\s*'ticket'/);
  assert.match(pageSource, /activateSession\(\{ session: result\.createdSessionId \}\)/);
  assert.match(pageSource, /navigate\('\/dashboard'/);
});

test('admin login hides broken social OAuth buttons while provider config is repaired', () => {
  assert.match(loginSource, /socialButtonsBlockButton:\s*'hidden'/);
  assert.match(loginSource, /dividerRow:\s*'hidden'/);
});

test('admin login offers emergency staff PIN access', () => {
  assert.match(appSource, /hasStaffRescueAccess/);
  assert.match(loginSource, /saveStaffRescuePin/);
  assert.match(loginSource, /\/api\/admin-rescue\/session/);
  assert.match(loginSource, /X-Staff-Rescue-Pin/);
});
