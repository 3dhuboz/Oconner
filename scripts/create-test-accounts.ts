/**
 * Create test accounts for development/testing.
 * 
 * Creates:
 *   1. testadmin@wirez.test  (role: admin)
 *   2. testtech@wirez.test   (role: user — technician)
 * 
 * Both accounts get password: TestPass123!
 * 
 * Usage: npx tsx scripts/create-test-accounts.ts
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_ACCOUNTS = [
  {
    email: 'testadmin@wirez.test',
    password: 'TestPass123!',
    displayName: 'Test Admin',
    role: 'admin',
  },
  {
    email: 'testtech@wirez.test',
    password: 'TestPass123!',
    displayName: 'Test Technician',
    role: 'user',
  },
];

async function createAccount(account: typeof TEST_ACCOUNTS[0]) {
  let uid: string;

  try {
    // Try to create the account
    const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
    uid = cred.user.uid;
    await updateProfile(cred.user, { displayName: account.displayName });
    console.log(`✅ Created Firebase Auth account: ${account.email} (uid: ${uid})`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      // Account exists — sign in to get the uid
      const cred = await signInWithEmailAndPassword(auth, account.email, account.password);
      uid = cred.user.uid;
      console.log(`⚡ Account already exists: ${account.email} (uid: ${uid}) — updating profile`);
    } else {
      console.error(`❌ Failed to create ${account.email}:`, err.message);
      return;
    }
  }

  // Create/update Firestore user profile
  const profileRef = doc(db, 'userProfiles', uid);
  await setDoc(profileRef, {
    uid,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    createdAt: new Date().toISOString(),
    isActive: true,
    isTestAccount: true,
  }, { merge: true });

  console.log(`   📋 Firestore profile set: role=${account.role}`);
}

async function main() {
  console.log('\n🔧 Creating test accounts for Wirez R Us...\n');
  console.log(`   Project: ${firebaseConfig.projectId}`);
  console.log('');

  for (const account of TEST_ACCOUNTS) {
    await createAccount(account);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  Test Admin Login:');
  console.log('    Email:    testadmin@wirez.test');
  console.log('    Password: TestPass123!');
  console.log('    Role:     admin');
  console.log('');
  console.log('  Test Technician Login:');
  console.log('    Email:    testtech@wirez.test');
  console.log('    Password: TestPass123!');
  console.log('    Role:     user (technician)');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
