/**
 * Create test accounts for development/testing.
 * Uses Clerk backend API to create users + REST API to set D1 profiles.
 *
 * Creates:
 *   1. testadmin@wirez.test  (role: admin)
 *   2. testtech@wirez.test   (role: user — technician)
 *
 * Both accounts get password: TestPass123!
 *
 * Usage: npx tsx scripts/create-test-accounts.ts
 * Requires: CLERK_SECRET_KEY and DEV_SERVER=http://localhost:3000 in .env
 */

import dotenv from 'dotenv';

dotenv.config();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DEV_SERVER = process.env.DEV_SERVER || 'http://localhost:3000';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY not set in .env');
  process.exit(1);
}

const TEST_ACCOUNTS = [
  { email: 'testadmin@wirez.test', password: 'TestPass123!', displayName: 'Test Admin', role: 'admin' },
  { email: 'testtech@wirez.test',  password: 'TestPass123!', displayName: 'Test Technician', role: 'user' },
];

async function createClerkUser(email: string, password: string, name: string): Promise<string | null> {
  const [firstName, ...rest] = name.split(' ');
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      first_name: firstName,
      last_name: rest.join(' ') || undefined,
    }),
  });

  if (res.status === 422) {
    const body = await res.json() as any;
    const dupe = body.errors?.find((e: any) => e.code === 'form_identifier_exists');
    if (dupe) {
      console.log(`⚡ Account already exists in Clerk: ${email} — looking up ID`);
      const listRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
      });
      const users = await listRes.json() as any[];
      return users[0]?.id ?? null;
    }
    console.error('❌ Clerk 422:', JSON.stringify(body));
    return null;
  }

  if (!res.ok) {
    console.error(`❌ Clerk error ${res.status}:`, await res.text());
    return null;
  }

  const user = await res.json() as any;
  console.log(`✅ Created Clerk user: ${email} (id: ${user.id})`);
  return user.id;
}

async function setProfile(uid: string, account: typeof TEST_ACCOUNTS[0]) {
  const res = await fetch(`${DEV_SERVER}/api/data/profiles?id=${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      createdAt: new Date().toISOString(),
      isActive: true,
      isTestAccount: true,
    }),
  });

  if (!res.ok) {
    console.warn(`   ⚠️ Profile API returned ${res.status} — is the dev server running?`);
    return;
  }
  console.log(`   📋 D1 profile set: role=${account.role}`);
}

async function main() {
  console.log('\n🔧 Creating test accounts for Wirez R Us (Clerk + D1)...\n');

  for (const account of TEST_ACCOUNTS) {
    console.log(`→ ${account.email}`);
    const uid = await createClerkUser(account.email, account.password, account.displayName);
    if (uid) await setProfile(uid, account);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Test Admin:       testadmin@wirez.test / TestPass123!  (role: admin)');
  console.log('  Test Technician:  testtech@wirez.test  / TestPass123!  (role: user)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
