/**
 * O'Connor Agriculture — Firestore seed script
 *
 * Prerequisites:
 *   1. Download your Firebase service account JSON from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save it as service-account.json in the repo root (already in .gitignore)
 *      OR set env var: FIREBASE_SERVICE_ACCOUNT=<json string>
 *
 * Run from repo root:
 *   node scripts/seed.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let admin;
try {
  admin = require('firebase-admin');
} catch {
  // Try from functions package if not hoisted
  admin = require('../functions/node_modules/firebase-admin');
}

import { readFileSync, existsSync } from 'fs';

// Load service account
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (existsSync('./service-account.json')) {
  serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
} else {
  console.error('ERROR: No service account found.');
  console.error('Either set FIREBASE_SERVICE_ACCOUNT env var or place service-account.json in repo root.');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

// ─── Dev Users ───────────────────────────────────────────────────────────────

const DEV_USERS = [
  { email: 'steve@3dhub.au', password: '123456', displayName: 'Steve (Dev)', role: 'admin' },
];

async function seedUsers() {
  for (const u of DEV_USERS) {
    try {
      const user = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.displayName,
        emailVerified: true,
      });
      await auth.setCustomUserClaims(user.uid, { role: u.role });
      console.log(`✅ Created user: ${u.email} (${u.role})`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(u.email);
        await auth.setCustomUserClaims(existing.uid, { role: u.role });
        console.log(`⚠️  User exists, updated claims: ${u.email} (${u.role})`);
      } else {
        throw e;
      }
    }
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

const now = admin.firestore.Timestamp.now();

const PRODUCTS = [
  // ── Beef Boxes (packs) ──
  {
    name: 'BBQ Box',
    description:
      'The perfect summer pack. Includes Rib Fillet, Eye Fillet, Sirloin, Topside, Brisket, Mince and Thick Sausages. 7–9kg of premium regeneratively farmed grass fed beef.',
    category: 'packs',
    isMeatPack: true,
    fixedPrice: 29000,
    packContents: 'Rib Fillet, Eye Fillet, Sirloin, Topside, Brisket, Mince, Thick Sausages',
    imageUrl: '',
    stockOnHand: 20,
    minThreshold: 3,
    active: true,
    displayOrder: 1,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Family Box',
    description:
      'The everyday family pack. Rump, Y-Bone, Rib Roast, Silverside, Diced Beef, Stir Fry Strips, Mince and Thick Sausages. 10–12kg of premium grass fed beef.',
    category: 'packs',
    isMeatPack: true,
    fixedPrice: 29000,
    packContents: 'Rump, Y-Bone, Rib Roast, Silverside, Diced Beef, Stir Fry Strips, Mince, Thick Sausages',
    imageUrl: '',
    stockOnHand: 20,
    minThreshold: 3,
    active: true,
    displayOrder: 2,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Double Box',
    description:
      'BBQ Box and Family Box combined — the ultimate package for large families or to stock the freezer. Approximately 17–21kg. Best value per kg.',
    category: 'packs',
    isMeatPack: true,
    fixedPrice: 55000,
    packContents: 'BBQ Box + Family Box combined',
    imageUrl: '',
    stockOnHand: 10,
    minThreshold: 2,
    active: true,
    displayOrder: 3,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Value Box',
    description:
      '50% Mince & Thick Sausages, 25% Roasts (Rib Roast, Silverside, Brisket), 25% Secondary Cuts (Topside, Y-Bone, Stir Fry Strips, Diced Beef). 10kg.',
    category: 'packs',
    isMeatPack: true,
    fixedPrice: 22000,
    packContents: '50% Mince/Sausages, 25% Roasts, 25% Secondary Cuts',
    imageUrl: '',
    stockOnHand: 25,
    minThreshold: 3,
    active: true,
    displayOrder: 4,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },

  // ── Individual Cuts (beef) ──
  {
    name: 'Eye Fillet',
    description:
      'The most tender cut. Premium grass fed eye fillet from the Boyne Valley. Perfect for special occasions, pan-seared or on the grill.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 6500,
    weightOptions: [500, 1000, 1500],
    imageUrl: '',
    stockOnHand: 15,
    minThreshold: 2,
    active: true,
    displayOrder: 5,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Rib Fillet',
    description:
      'Rich marbling and full flavour. Grass fed rib fillet from our Boyne Valley cattle — great on the BBQ or in a cast iron pan.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 5000,
    weightOptions: [500, 1000, 1500, 2000],
    imageUrl: '',
    stockOnHand: 20,
    minThreshold: 2,
    active: true,
    displayOrder: 6,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Sirloin',
    description:
      'Classic grass fed sirloin. Well-marbled, full flavoured and versatile — great for steak nights or slow roasting.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 3800,
    weightOptions: [500, 1000, 2000],
    imageUrl: '',
    stockOnHand: 25,
    minThreshold: 3,
    active: true,
    displayOrder: 7,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Rump',
    description:
      'A crowd favourite. Lean, flavourful grass fed rump from the Boyne Valley. Excellent value for everyday grilling or slicing thin for stir fries.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 2800,
    weightOptions: [500, 1000, 2000],
    imageUrl: '',
    stockOnHand: 30,
    minThreshold: 3,
    active: true,
    displayOrder: 8,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Beef Mince',
    description:
      'Premium grass fed beef mince with no fillers and no preservatives. Perfect for bolognese, burgers, meatballs, and everyday cooking.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 1800,
    weightOptions: [500, 1000, 2000],
    imageUrl: '',
    stockOnHand: 50,
    minThreshold: 5,
    active: true,
    displayOrder: 9,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Thick Sausages',
    description:
      'Handmade thick beef sausages from our grass fed cattle. 100% beef, no fillers, no preservatives. Kids love them.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 1600,
    weightOptions: [500, 1000],
    imageUrl: '',
    stockOnHand: 40,
    minThreshold: 5,
    active: true,
    displayOrder: 10,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Brisket',
    description:
      'Slow cook it, smoke it, or braise it. Grass fed brisket from the Boyne Valley — the ultimate low-and-slow cut.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 2200,
    weightOptions: [1000, 1500, 2000],
    imageUrl: '',
    stockOnHand: 18,
    minThreshold: 2,
    active: true,
    displayOrder: 11,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Diced Beef',
    description:
      'Ready-to-cook diced grass fed beef. Perfect for stews, curries, and casseroles. Tender and full of flavour.',
    category: 'beef',
    isMeatPack: false,
    pricePerKg: 2000,
    weightOptions: [500, 1000],
    imageUrl: '',
    stockOnHand: 35,
    minThreshold: 4,
    active: true,
    displayOrder: 12,
    gstApplicable: false,
    createdAt: now,
    updatedAt: now,
  },
];

async function seedProducts() {
  const existing = await db.collection('products').get();
  if (!existing.empty) {
    console.log(`⚠️  Products collection already has ${existing.size} docs — skipping product seed.`);
    console.log('   Delete products in Firebase Console first if you want to re-seed.');
    return;
  }

  for (const product of PRODUCTS) {
    const ref = db.collection('products').doc();
    await ref.set(product);
    console.log(`✅ Seeded product: ${product.name}`);
  }
}

// ─── Site Config (storefront homepage settings) ───────────────────────────────

const STOREFRONT_CONFIG = {
  hero: {
    badge: 'Locally Raised • Grass Fed • Naturally Healthy',
    headline: "Local Grass Fed Beef.",
    headlineLine2: "Delivered to Your Door.",
    body: "First generation family farm from the Boyne Valley, QLD. We use regenerative management practices to produce quality beef that's good for the land and good for you.",
    tagline: '"Good for the land. Good for the community. Good for you."',
    primaryCta: 'Order Now',
    secondaryCta: 'Delivery Schedule',
    heroImageUrl: '',
  },
  features: [
    {
      icon: '🌿',
      title: 'Regenerative Farming',
      description: 'We focus on soil health and animal welfare, producing beef you can feel good about eating.',
    },
    {
      icon: '🚚',
      title: 'Free Delivery',
      description: 'Temperature-controlled delivery straight to your door. All prices include delivery.',
    },
    {
      icon: '👨‍👩‍👧',
      title: 'Family Owned',
      description: 'First generation family farm from Calliope and the Boyne Valley, QLD.',
    },
  ],
  cta: {
    headline: 'Ready to Order?',
    subtext: 'Browse our beef boxes — BBQ Box, Family Box, Double, and Value Box.',
    note: 'All prices include free delivery to your door.',
    buttonText: 'View Beef Boxes',
  },
  contact: {
    email: 'orders@oconnoragriculture.com.au',
    social: 'https://www.facebook.com/profile.php?id=61574996320860',
    location: 'Calliope & Boyne Valley, QLD',
  },
  updatedAt: now,
};

async function seedConfig() {
  await db.collection('config').doc('storefront').set(STOREFRONT_CONFIG, { merge: true });
  console.log('✅ Seeded config/storefront');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 O\'Connor Agriculture — Firestore seed\n');
  await seedUsers();
  await seedProducts();
  await seedConfig();
  console.log('\n✅ Seed complete!\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
