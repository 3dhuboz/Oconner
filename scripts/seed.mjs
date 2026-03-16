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
const candidates = [
  './node_modules/firebase-admin',
  '../node_modules/firebase-admin',
  '../functions/node_modules/firebase-admin',
];
for (const p of candidates) {
  try { admin = require(p); break; } catch {}
}
if (!admin) throw new Error('firebase-admin not found. Run: cd scripts && npm install');

import { readFileSync, existsSync } from 'fs';

// Load credentials — three options in order of priority:
//  1. FIREBASE_SERVICE_ACCOUNT env var (JSON string)
//  2. service-account.json file in repo root
//  3. Application Default Credentials (gcloud auth application-default login)
let appCredential;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  appCredential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  console.log('✓ Using FIREBASE_SERVICE_ACCOUNT env var');
} else if (existsSync('./service-account.json')) {
  appCredential = admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')));
  console.log('✓ Using service-account.json');
} else {
  appCredential = admin.credential.applicationDefault();
  console.log('✓ Using Application Default Credentials (gcloud ADC)');
}

admin.initializeApp({ credential: appCredential, projectId: 'butchers-fc7e1' });
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
    heroImageUrl: '/hero-cows.jpg',
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

// ─── Delivery Days ────────────────────────────────────────────────────────────

function nextNSaturdays(n) {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 6) days.push(new Date(d));
  }
  return days;
}

async function seedDeliveryDays() {
  const existing = await db.collection('deliveryDays').get();
  if (!existing.empty) {
    console.log(`⚠️  deliveryDays already has ${existing.size} docs — skipping.`);
    return [];
  }
  const saturdays = nextNSaturdays(6);
  const ids = [];
  for (let i = 0; i < saturdays.length; i++) {
    const ref = db.collection('deliveryDays').doc();
    await ref.set({
      date: admin.firestore.Timestamp.fromDate(saturdays[i]),
      maxOrders: 20,
      orderCount: 0,
      active: true,
      notes: i === 0 ? 'Gladstone & Calliope run' : '',
      createdAt: admin.firestore.Timestamp.now(),
    });
    ids.push({ id: ref.id, date: saturdays[i] });
    console.log(`✅ Delivery day: ${saturdays[i].toDateString()}`);
  }
  return ids;
}

// ─── Sample Orders + Stops ────────────────────────────────────────────────────

const SAMPLE_CUSTOMERS = [
  { name: 'Sarah Mitchell', email: 'sarah.m@example.com', phone: '0412 345 678', line1: '14 Dawson Rd', suburb: 'Calliope', state: 'QLD', postcode: '4680', note: 'Leave at front door. Beware of dog.' },
  { name: 'Tom Brennan', email: 'tom.b@example.com', phone: '0423 456 789', line1: '8 Roseberry St', suburb: 'Gladstone', state: 'QLD', postcode: '4680', note: '' },
  { name: 'Kylie Ross', email: 'kylie.r@example.com', phone: '0434 567 890', line1: '21 Pacific Dr', suburb: 'Boyne Island', state: 'QLD', postcode: '4680', note: 'Side gate is unlocked.' },
  { name: 'James Nguyen', email: 'james.n@example.com', phone: '0445 678 901', line1: '5 Barolin St', suburb: 'Tannum Sands', state: 'QLD', postcode: '4680', note: '' },
  { name: 'Lisa Carpenter', email: 'lisa.c@example.com', phone: '0456 789 012', line1: '33 Flynn St', suburb: 'Agnes Water', state: 'QLD', postcode: '4677', note: 'Call on arrival.' },
];

const SAMPLE_ITEMS = [
  [{ productId: 'bbx', productName: 'BBQ Box', isMeatPack: true, quantity: 1, weight: 0, unitPrice: 29000 }],
  [{ productId: 'fam', productName: 'Family Box', isMeatPack: true, quantity: 1, weight: 0, unitPrice: 29000 }],
  [{ productId: 'dbl', productName: 'Double Box', isMeatPack: true, quantity: 1, weight: 0, unitPrice: 55000 }],
  [{ productId: 'val', productName: 'Value Box', isMeatPack: true, quantity: 1, weight: 0, unitPrice: 22000 }],
  [{ productId: 'bbx', productName: 'BBQ Box', isMeatPack: true, quantity: 2, weight: 0, unitPrice: 58000 }],
];

async function seedSampleOrders(deliveryDayId) {
  const existing = await db.collection('orders').get();
  if (!existing.empty) {
    console.log(`⚠️  orders already has ${existing.size} docs — skipping.`);
    return;
  }
  for (let i = 0; i < SAMPLE_CUSTOMERS.length; i++) {
    const c = SAMPLE_CUSTOMERS[i];
    const items = SAMPLE_ITEMS[i];
    const total = items.reduce((s, it) => s + it.unitPrice, 0);
    const orderRef = db.collection('orders').doc();
    await orderRef.set({
      deliveryDayId,
      customerName: c.name,
      customerEmail: c.email,
      customerPhone: c.phone,
      customerId: '',
      address: { line1: c.line1, line2: '', suburb: c.suburb, state: c.state, postcode: c.postcode },
      items,
      total,
      status: 'confirmed',
      customerNote: c.note,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    const stopRef = db.collection('stops').doc();
    await stopRef.set({
      orderId: orderRef.id,
      deliveryDayId,
      customerName: c.name,
      customerEmail: c.email,
      customerPhone: c.phone,
      address: { line1: c.line1, line2: '', suburb: c.suburb, state: c.state, postcode: c.postcode },
      customerNote: c.note,
      items,
      sequence: i + 1,
      status: 'pending',
      proofUrl: null,
      driverNote: null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Order + stop: ${c.name}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 O\'Connor Agriculture — Firestore seed\n');
  try {
    await seedUsers();
  } catch (e) {
    console.warn('⚠️  seedUsers skipped (ADC lacks Firebase Auth admin scope):');
    console.warn('   Create the admin user manually in Firebase Console:');
    console.warn('   Authentication → Add user → steve@3dhub.au / 123456');
    console.warn('   Then set custom claim role=admin via the Firebase Console or Admin SDK.');
    console.warn('   Error:', e.message);
  }
  await seedProducts();
  await seedConfig();
  const dayIds = await seedDeliveryDays();
  if (dayIds.length > 0) {
    await seedSampleOrders(dayIds[0].id);
  }
  console.log('\n✅ Seed complete!\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
