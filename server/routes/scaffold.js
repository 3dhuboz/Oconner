const express = require('express');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const ClientProject = require('../models/ClientProject');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// ═══════════════════════════════════════════
// GITHUB AUTOMATION HELPER
// Creates a new private repo under GITHUB_ORG
// (or the authenticated user if no org is set)
// Returns the HTTPS clone URL on success.
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// MONGODB ATLAS HELPER
// Creates a dedicated DB user scoped to the
// client's database (optional — only runs if
// MONGODB_ATLAS_PUBLIC_KEY + PRIVATE_KEY are set)
// ═══════════════════════════════════════════
async function createAtlasDbUser(dbName, username, password) {
  const pub  = process.env.MONGODB_ATLAS_PUBLIC_KEY;
  const priv = process.env.MONGODB_ATLAS_PRIVATE_KEY;
  const proj = process.env.MONGODB_ATLAS_PROJECT_ID;
  if (!pub || !priv || !proj) return null;

  const credentials = Buffer.from(`${pub}:${priv}`).toString('base64');
  const res = await fetch(
    `https://cloud.mongodb.com/api/atlas/v1.0/groups/${proj}/databaseUsers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        databaseName: 'admin',
        username,
        password,
        roles: [{ databaseName: dbName, roleName: 'readWrite' }]
      })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Atlas API ${res.status}: ${err.detail || err.error || 'unknown'}`);
  }
  return await res.json();
}

async function createGitHubRepo(repoName, description) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const org = process.env.GITHUB_ORG || '';
  const apiUrl = org
    ? `https://api.github.com/orgs/${org}/repos`
    : 'https://api.github.com/user/repos';

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: repoName,
      description,
      private: true,
      auto_init: false
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // 422 = repo already exists — return the expected URL so scaffold can still push
    if (res.status === 422) {
      const owner = org || process.env.GITHUB_USER || '';
      return owner ? `https://github.com/${owner}/${repoName}.git` : null;
    }
    throw new Error(`GitHub API ${res.status}: ${err.message || 'unknown error'}`);
  }

  const data = await res.json();
  return data.clone_url;
}

// ═══════════════════════════════════════════
// TEMPLATE REGISTRY
// Maps app slugs to their git repos and type
// ═══════════════════════════════════════════
const TEMPLATES = {
  'simple-website': {
    repo: 'https://github.com/3dhuboz/Penny-Wise-IT.git',
    type: 'pennywise-module',
    defaultBranch: 'main',
    enabledApps: 'simple-website',
    description: 'White-label e-commerce website (React/MongoDB/Express)'
  },
  'social-ai-studio': {
    repo: 'https://github.com/3dhuboz/Penny-Wise-IT.git',
    type: 'pennywise-module',
    defaultBranch: 'main',
    enabledApps: 'social-ai-studio',
    description: 'SocialAI Studio — AI social media content & scheduling'
  },
  'foodtruc': {
    repo: 'https://github.com/3dhuboz/Penny-Wise-IT.git',
    type: 'pennywise-module',
    defaultBranch: 'main',
    enabledApps: 'foodtruc',
    description: 'Food Truck ordering & loyalty app'
  },
  'autohue': {
    repo: 'https://github.com/3dhuboz/Penny-Wise-IT.git',
    type: 'pennywise-module',
    defaultBranch: 'main',
    enabledApps: 'autohue',
    description: 'AutoHue — AI vehicle photo colour sorter'
  },
  'wirez': {
    repo: 'https://github.com/3dhuboz/Penny-Wise-IT.git',
    type: 'pennywise-module',
    defaultBranch: 'main',
    enabledApps: 'wirez',
    description: 'Wirez electrician workflow'
  }
};

// ═══════════════════════════════════════════
// ENVIRONMENT CONFIG GENERATORS
// ═══════════════════════════════════════════
function getSampleEnv(template, project) {
  const brand = project.businessName || project.projectName;
  const tagline = project.whiteLabel?.tagline || `Welcome to ${brand}`;
  const primaryColor = project.whiteLabel?.primaryColor || '#3b82f6';

  if (template.type === 'standalone') {
    const dbSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const clusterBase = (process.env.MONGODB_URI || '').split('/').slice(0, 3).join('/') || 'mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net';
    const mongoUri = `${clusterBase}/${dbSlug}-db?retryWrites=true&w=majority`;
    return `# ${brand} — Auto-generated by Penny Wise I.T Scaffold
# Update these values with real credentials before deploying

NODE_ENV=development
PORT=5000

# Client mode
CLIENT_MODE=true
BRAND_NAME="${brand}"
BRAND_TAGLINE="${tagline}"
PRIMARY_COLOR=${primaryColor}

# MongoDB — database auto-created on first write
MONGODB_URI=${mongoUri}

# Auth
JWT_SECRET=change-me-to-a-random-string-${Date.now()}
ADMIN_EMAIL=admin@${dbSlug}.com.au
ADMIN_PASSWORD=TempPass123!

# Square Payments (https://developer.squareup.com)
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox

# Google Gemini AI
GEMINI_API_KEY=

# Penny Wise I.T License
LICENSE_KEY=
LICENSE_API_URL=https://pennywiseit.com.au/api/marketplace/validate-license
`;
  }

  // Pennywise module — .env file
  const enabledApps = project.apps?.map(a => a.slug).join(',') || template.enabledApps;
  return `# ${brand} — Auto-generated by Penny Wise I.T Scaffold
# Update these values with real credentials before deploying

NODE_ENV=development
PORT=5000

# Client mode — isolates this as a client deployment
CLIENT_MODE=true
ENABLED_APPS=${enabledApps}
BRAND_NAME="${brand}"
BRAND_TAGLINE="${tagline}"
PRIMARY_COLOR=${primaryColor}

# MongoDB (create a free cluster at https://cloud.mongodb.com)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/${brand.toLowerCase().replace(/[^a-z0-9]/g, '-')}?retryWrites=true&w=majority

# Auth
JWT_SECRET=change-me-to-a-random-string-${Date.now()}
ADMIN_EMAIL=admin@${brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.au
ADMIN_PASSWORD=TempPass123!

# Square Payments
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox

# AI
GEMINI_API_KEY=
`;
}

// ═══════════════════════════════════════════
// AUTO-PUSH WATCHER SCRIPT
// Watches for file changes and auto-commits+pushes
// ═══════════════════════════════════════════
function getAutoPushScript() {
  return `// Auto-Push Watcher — Penny Wise I.T
// Watches for file changes and auto-commits + pushes to remote
// Usage: node scripts/autopush.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DEBOUNCE_MS = 5000;
const IGNORED = /node_modules|\\.git|dist|build|\\.next/;

let pushTimer = null;
let changeCount = 0;

function autoPush() {
  try {
    execSync('git add -A', { cwd: PROJECT_DIR, stdio: 'pipe' });
    const status = execSync('git status --porcelain', { cwd: PROJECT_DIR, stdio: 'pipe' }).toString().trim();
    if (!status) { changeCount = 0; return; }

    const lines = status.split('\\n').length;
    const timestamp = new Date().toLocaleString('en-AU');
    execSync(\`git commit -m "Auto-save: \${lines} file(s) changed — \${timestamp}"\`, { cwd: PROJECT_DIR, stdio: 'pipe' });

    try {
      execSync('git push', { cwd: PROJECT_DIR, stdio: 'pipe', timeout: 30000 });
      console.log(\`[AutoPush] \\x1b[32m✓ Pushed \${lines} change(s) at \${timestamp}\\x1b[0m\`);
    } catch (pushErr) {
      console.log(\`[AutoPush] \\x1b[33m⚠ Committed locally (add a git remote to enable push)\\x1b[0m\`);
    }
    changeCount = 0;
  } catch (err) {
    // Nothing to commit
  }
}

function onFileChange(eventType, filename) {
  if (!filename || IGNORED.test(filename)) return;
  changeCount++;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(autoPush, DEBOUNCE_MS);
  if (changeCount === 1) {
    console.log(\`[AutoPush] Change detected, waiting \${DEBOUNCE_MS / 1000}s before push...\`);
  }
}

// Watch recursively
console.log('[AutoPush] \\x1b[36mWatching for changes...\\x1b[0m');
console.log('[AutoPush] Save files normally — changes auto-commit & push after ' + (DEBOUNCE_MS / 1000) + 's of inactivity');
console.log('[AutoPush] Press Ctrl+C to stop\\n');

try {
  fs.watch(PROJECT_DIR, { recursive: true }, onFileChange);
} catch (err) {
  console.error('[AutoPush] Error starting watcher:', err.message);
  // Fallback: poll every 10s
  console.log('[AutoPush] Falling back to polling mode (10s interval)');
  setInterval(autoPush, 10000);
}
`;
}

// ═══════════════════════════════════════════
// VS CODE / WINDSURF CONFIGURATION
// ═══════════════════════════════════════════
function getVSCodeSettings() {
  return JSON.stringify({
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 2000,
    "editor.formatOnSave": true,
    "git.autofetch": true,
    "git.enableSmartCommit": true,
    "git.postCommitCommand": "push",
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true
    }
  }, null, 2);
}

function getVSCodeTasks() {
  return JSON.stringify({
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Auto-Push Watcher",
        "type": "shell",
        "command": "node scripts/autopush.js",
        "isBackground": true,
        "problemMatcher": [],
        "presentation": {
          "reveal": "silent",
          "panel": "dedicated",
          "echo": true
        },
        "runOptions": {
          "runOn": "folderOpen"
        }
      },
      {
        "label": "Install Dependencies",
        "type": "shell",
        "command": "npm install",
        "problemMatcher": [],
        "presentation": {
          "reveal": "always",
          "panel": "shared"
        }
      },
      {
        "label": "Start Dev Server",
        "type": "shell",
        "command": "npm run dev",
        "isBackground": true,
        "problemMatcher": [],
        "presentation": {
          "reveal": "always",
          "panel": "dedicated"
        }
      }
    ]
  }, null, 2);
}

// ═══════════════════════════════════════════
// SAMPLE DATA SEED SCRIPT
// Creates sample content for the client's apps
// ═══════════════════════════════════════════
function getSeedScript(project, appSlugs) {
  const brand = project.businessName || project.projectName;
  return `// Sample Data Seed — ${brand}
// Auto-generated by Penny Wise I.T Scaffold
// Run once: node scripts/seed-sample-data.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI.includes('user:pass@')) {
  console.error('\\x1b[31m✗ Set your MONGODB_URI in .env before seeding!\\x1b[0m');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

${appSlugs.includes('foodtruc') ? `
  // ── Food Truck Sample Data ──────────────────
  console.log('Seeding Food Truck data...');
  
  const menuItems = [
    { name: 'Classic Smash Burger', description: 'Double smashed beef patties with American cheese, pickles, and special sauce', price: 16.50, category: 'Burgers', image: '', available: true, popular: true },
    { name: 'Southern Fried Chicken Burger', description: 'Crispy fried chicken breast with slaw and chipotle mayo', price: 17.00, category: 'Burgers', image: '', available: true, popular: true },
    { name: 'Loaded Fries', description: 'Seasoned fries topped with cheese sauce, bacon bits, and spring onion', price: 12.00, category: 'Sides', image: '', available: true, popular: false },
    { name: 'Sweet Potato Fries', description: 'Crispy sweet potato fries with aioli', price: 10.00, category: 'Sides', image: '', available: true, popular: false },
    { name: 'Pulled Pork Tacos (3pk)', description: 'Slow-cooked pulled pork with mango salsa and lime crema', price: 15.00, category: 'Mains', image: '', available: true, popular: true },
    { name: 'Grilled Halloumi Wrap', description: 'Grilled halloumi with roasted veg, hummus, and rocket in a toasted wrap', price: 14.50, category: 'Mains', image: '', available: true, popular: false },
    { name: 'Can of Coke', description: 'Coca-Cola 375ml', price: 4.00, category: 'Drinks', image: '', available: true, popular: false },
    { name: 'Lemonade', description: 'House-made lemonade with mint', price: 6.00, category: 'Drinks', image: '', available: true, popular: false },
    { name: 'Churros (6pk)', description: 'Cinnamon sugar churros with chocolate dipping sauce', price: 10.00, category: 'Desserts', image: '', available: true, popular: true },
    { name: 'Kids Nuggets & Chips', description: '6 chicken nuggets with chips and tomato sauce', price: 10.00, category: 'Kids', image: '', available: true, popular: false }
  ];
  
  await db.collection('menuitems').deleteMany({});
  await db.collection('menuitems').insertMany(menuItems.map(item => ({
    ...item,
    createdAt: new Date(),
    updatedAt: new Date()
  })));
  console.log('  ✓ ' + menuItems.length + ' menu items seeded');

  // Seed categories
  const categories = ['Burgers', 'Mains', 'Sides', 'Drinks', 'Desserts', 'Kids'];
  await db.collection('menucategories').deleteMany({});
  await db.collection('menucategories').insertMany(categories.map((name, i) => ({
    name, displayOrder: i, active: true, createdAt: new Date()
  })));
  console.log('  ✓ ' + categories.length + ' categories seeded');
` : ''}
${appSlugs.includes('social-ai-studio') ? `
  // ── SocialAI Studio Sample Data ─────────────
  console.log('Seeding SocialAI Studio data...');

  await db.collection('brandprofiles').deleteMany({});
  await db.collection('brandprofiles').insertMany([{
    name: '${brand}',
    industry: 'Food & Hospitality',
    voiceTone: 'Friendly, casual, community-focused',
    targetAudience: 'Local foodies, families, event-goers aged 18-45',
    brandValues: 'Quality ingredients, good vibes, supporting local',
    hashtags: ['#${brand.replace(/\\s+/g, '')}', '#StreetFood', '#FoodTruck', '#LocalEats', '#Foodie'],
    postingSchedule: { monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: true, sunday: false },
    socialAccounts: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }]);
  console.log('  ✓ Brand profile seeded');

  // Sample content ideas
  await db.collection('contentideas').deleteMany({});
  await db.collection('contentideas').insertMany([
    { title: 'Behind the scenes prep', type: 'photo', status: 'draft', platform: 'instagram', notes: 'Show the morning prep routine — chopping, seasoning, firing up the grill', createdAt: new Date() },
    { title: 'Menu item spotlight', type: 'photo', status: 'draft', platform: 'facebook', notes: 'Close-up hero shot of the best-selling burger with steam rising', createdAt: new Date() },
    { title: 'Customer testimonial', type: 'video', status: 'draft', platform: 'instagram', notes: 'Quick 15-second clip of a happy customer at the truck window', createdAt: new Date() },
    { title: 'Weekend location reveal', type: 'photo', status: 'scheduled', platform: 'facebook', notes: 'Announce this weekend\\'s location with a map pin and menu teaser', createdAt: new Date() },
    { title: 'New menu item teaser', type: 'photo', status: 'draft', platform: 'instagram', notes: 'Blurred sneak peek of upcoming seasonal special', createdAt: new Date() }
  ]);
  console.log('  ✓ 5 content ideas seeded');
` : ''}
${appSlugs.includes('simple-website') || appSlugs.includes('simplewebsite') ? `
  // ── SimpleWebsite Sample Data ───────────────
  console.log('Seeding SimpleWebsite data...');

  await db.collection('products').deleteMany({});
  await db.collection('products').insertMany([
    { name: 'Classic T-Shirt', description: 'Premium cotton crew-neck tee. Available in multiple colours.', price: 35.00, category: 'Apparel', image: '', stock: 50, featured: true, active: true, createdAt: new Date() },
    { name: 'Logo Hoodie', description: 'Heavyweight brushed fleece hoodie with embroidered logo.', price: 75.00, category: 'Apparel', image: '', stock: 30, featured: true, active: true, createdAt: new Date() },
    { name: 'Cap — Snapback', description: 'Structured snapback cap with flat brim and woven patch.', price: 32.00, category: 'Accessories', image: '', stock: 40, featured: false, active: true, createdAt: new Date() },
    { name: 'Tote Bag', description: 'Heavy-duty canvas tote with reinforced handles. Perfect everyday bag.', price: 28.00, category: 'Accessories', image: '', stock: 60, featured: false, active: true, createdAt: new Date() },
    { name: 'Sticker Pack (5)', description: 'Set of 5 die-cut vinyl stickers. Weatherproof and UV resistant.', price: 12.00, category: 'Merch', image: '', stock: 100, featured: true, active: true, createdAt: new Date() },
    { name: 'Coffee Mug', description: 'Ceramic 350ml mug with full-wrap print. Dishwasher safe.', price: 22.00, category: 'Merch', image: '', stock: 45, featured: false, active: true, createdAt: new Date() }
  ]);
  console.log('  ✓ 6 products seeded');

  await db.collection('categories').deleteMany({});
  await db.collection('categories').insertMany([
    { name: 'Apparel', slug: 'apparel', displayOrder: 0, active: true },
    { name: 'Accessories', slug: 'accessories', displayOrder: 1, active: true },
    { name: 'Merch', slug: 'merch', displayOrder: 2, active: true }
  ]);
  console.log('  ✓ 3 categories seeded');
` : ''}
${appSlugs.includes('wirez') ? `
  // ── Wirez Sample Data ───────────────────────
  console.log('Seeding Wirez data...');

  await db.collection('jobs').deleteMany({});
  await db.collection('jobs').insertMany([
    { title: 'Power Point Installation', client: 'Unit 4, 22 Smith St', tenant: 'Sarah Johnson', phone: '0412 345 678', status: 'pending', priority: 'normal', description: 'Install 2x double power points in living room. Tenant has marked locations.', materials: ['2x Double GPO', '14m 2.5mm TPS', 'Mounting blocks'], createdAt: new Date() },
    { title: 'Smoke Alarm Replacement', client: '8 Banksia Court', tenant: 'Mark Peters', phone: '0423 456 789', status: 'in-progress', priority: 'high', description: 'Replace 3x expired smoke alarms. Must be 240v interconnected per AS3786.', materials: ['3x Photoelectric Smoke Alarm 240V', 'Interconnect cable'], createdAt: new Date() },
    { title: 'Switchboard Upgrade', client: '156 Main Road', tenant: 'Property Manager — Ray White', phone: '0434 567 890', status: 'quoted', priority: 'normal', description: 'Upgrade old ceramic fuse switchboard to modern RCD/MCB board. Full rewire assessment needed.', materials: ['Switchboard 18-pole', 'RCD 2P 30mA', '6x MCB various ratings', 'Earth stake'], createdAt: new Date() },
    { title: 'Ceiling Fan Install', client: '3/44 Ocean Parade', tenant: 'David Chen', phone: '0445 678 901', status: 'pending', priority: 'low', description: 'Install ceiling fan in master bedroom. Existing light point — check wiring capacity.', materials: ['Ceiling fan hook bracket', 'Fan rated cable'], createdAt: new Date() }
  ]);
  console.log('  ✓ 4 sample jobs seeded');
` : ''}

  // ── Site Settings ───────────────────────────
  await db.collection('sitesettings').deleteMany({});
  await db.collection('sitesettings').insertMany([{
    brandName: '${brand}',
    tagline: '${project.whiteLabel?.tagline || `Welcome to ${brand}`}',
    primaryColor: '${project.whiteLabel?.primaryColor || '#3b82f6'}',
    secondaryColor: '${project.whiteLabel?.secondaryColor || '#1e1b4b'}',
    footerText: '© ${new Date().getFullYear()} ${brand}. All rights reserved.',
    contactEmail: '${project.contactEmail || `hello@${brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.au`}',
    contactPhone: '${project.contactPhone || ''}',
    gstRate: 10,
    currency: 'AUD',
    createdAt: new Date(),
    updatedAt: new Date()
  }]);
  console.log('  ✓ Site settings seeded');

  await mongoose.disconnect();
  console.log('\\n\\x1b[32m✓ Sample data seeded successfully!\\x1b[0m');
  console.log('Start the dev server: npm run dev');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
`;
}

// ═══════════════════════════════════════════
// README GENERATOR
// ═══════════════════════════════════════════
function getSampleReadme(project, appSlugs) {
  const brand = project.businessName || project.projectName;
  const appList = appSlugs.map(s => `- ${s}`).join('\n');
  return `# ${brand}

> Auto-scaffolded by [Penny Wise I.T](https://pennywiseit.com.au) on ${new Date().toLocaleDateString('en-AU')}

## Apps Included
${appList}

## Quick Start

Dependencies are pre-installed. Just run:

\`\`\`bash
npm run dev
\`\`\`

Open in browser: http://localhost:3000 (or http://localhost:5173 for Vite projects)

## Auto-Push

This project has an auto-push watcher. When you save files in Windsurf,
changes are automatically committed and pushed to your remote repo.

The watcher starts automatically when you open this folder in Windsurf.
You can also start it manually:

\`\`\`bash
node scripts/autopush.js
\`\`\`

To push to a remote repo (for live deployment), add a remote:

\`\`\`bash
git remote add origin https://github.com/YOUR-ORG/${brand.toLowerCase().replace(/[^a-z0-9]/g, '-')}.git
\`\`\`

## Sample Data

Run the seed script to populate sample content:

\`\`\`bash
node scripts/seed-sample-data.js
\`\`\`

## Branding

- **Business Name:** ${brand}
- **Tagline:** ${project.whiteLabel?.tagline || 'Update in admin'}
- **Primary Color:** ${project.whiteLabel?.primaryColor || '#3b82f6'}

## Managed by Penny Wise I.T
This project is managed via the Penny Wise I.T admin panel.
`;
}

// ═══════════════════════════════════════════
// SCAFFOLD ENDPOINT
// POST /api/scaffold/:projectId
// ═══════════════════════════════════════════
router.post('/:projectId', auth, adminOnly, async (req, res) => {
  try {
    // Only works locally — need filesystem + git access
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return res.status(400).json({
        message: 'Scaffolding only works when running locally. Start the server on your dev machine.'
      });
    }

    const project = await ClientProject.findById(req.params.projectId)
      .populate('client', 'firstName lastName email company');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Determine primary app template
    const appSlugs = project.apps?.map(a => a.slug) || [];
    if (appSlugs.length === 0) {
      return res.status(400).json({ message: 'No apps selected for this project. Add apps first.' });
    }

    // Use first app's template (primary app)
    const primarySlug = appSlugs[0];
    const template = TEMPLATES[primarySlug];
    if (!template) {
      return res.status(400).json({ message: `No template found for app: ${primarySlug}` });
    }

    // Determine target directory — custom path overrides default convention
    const baseDir = process.env.CLIENT_PROJECTS_BASE_DIR
      || path.join(require('os').homedir(), 'OneDrive', 'Desktop', 'Business Folders');
    const clientName = project.businessName || project.projectName;
    const safeName = clientName.replace(/[<>:"/\\|?*]/g, '').trim();
    const defaultDir = path.join(baseDir, safeName, 'App', safeName.replace(/\s+/g, '-'));
    const projectDir = req.body.projectPath ? path.resolve(req.body.projectPath) : defaultDir;

    // Check if already scaffolded
    if (fs.existsSync(projectDir) && fs.readdirSync(projectDir).length > 0) {
      project.localProjectPath = projectDir;
      await project.save();
      return res.json({
        message: `Project folder already exists at ${projectDir}. Path linked.`,
        localProjectPath: projectDir,
        alreadyExists: true
      });
    }

    // Create directory structure
    fs.mkdirSync(projectDir, { recursive: true });

    // ── Step 1: Clone template repo ──
    console.log(`[Scaffold] Step 1/5: Cloning ${template.repo}`);
    try {
      execSync(`git clone --depth 1 --branch ${template.defaultBranch} "${template.repo}" "${projectDir}"`, {
        stdio: 'pipe',
        timeout: 120000
      });
    } catch (cloneErr) {
      try { fs.rmSync(projectDir, { recursive: true, force: true }); } catch (e) {}
      return res.status(500).json({
        message: 'Git clone failed. Check your internet connection and git credentials.',
        error: cloneErr.stderr?.toString() || cloneErr.message
      });
    }

    // Remove template's .git
    const gitDir = path.join(projectDir, '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }

    // ── Step 2: Write config files ──
    console.log('[Scaffold] Step 2/5: Configuring project');
    const envContent = getSampleEnv(template, project);
    const envFile = template.type === 'standalone' ? '.env.local' : '.env';
    fs.writeFileSync(path.join(projectDir, envFile), envContent, 'utf8');
    fs.writeFileSync(path.join(projectDir, 'README.md'), getSampleReadme(project, appSlugs), 'utf8');

    // Scaffold metadata
    fs.writeFileSync(path.join(projectDir, '.pennywise.json'), JSON.stringify({
      scaffoldedAt: new Date().toISOString(),
      scaffoldedBy: 'Penny Wise I.T',
      template: primarySlug,
      templateRepo: template.repo,
      clientName, projectId: project._id.toString(), apps: appSlugs
    }, null, 2), 'utf8');

    // ── Step 3: Create scripts + VS Code config ──
    console.log('[Scaffold] Step 3/5: Setting up auto-push & editor config');
    const scriptsDir = path.join(projectDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, 'autopush.js'), getAutoPushScript(), 'utf8');
    fs.writeFileSync(path.join(scriptsDir, 'seed-sample-data.js'), getSeedScript(project, appSlugs), 'utf8');

    const vscodeDir = path.join(projectDir, '.vscode');
    fs.mkdirSync(vscodeDir, { recursive: true });
    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), getVSCodeSettings(), 'utf8');
    fs.writeFileSync(path.join(vscodeDir, 'tasks.json'), getVSCodeTasks(), 'utf8');

    // ── Step 4: Install dependencies ──
    console.log('[Scaffold] Step 4/5: Installing dependencies (this may take a minute)...');
    try {
      if (template.type === 'pennywise-module') {
        // Pennywise has root + client packages
        execSync('npm install --prefer-offline --no-audit --no-fund', {
          cwd: projectDir, stdio: 'pipe', timeout: 300000
        });
        const clientDir = path.join(projectDir, 'client');
        if (fs.existsSync(path.join(clientDir, 'package.json'))) {
          execSync('npm install --prefer-offline --no-audit --no-fund', {
            cwd: clientDir, stdio: 'pipe', timeout: 300000
          });
        }
      } else {
        // Standalone (SimpleWebsite etc.)
        execSync('npm install --prefer-offline --no-audit --no-fund', {
          cwd: projectDir, stdio: 'pipe', timeout: 300000
        });
      }
      console.log('[Scaffold] Dependencies installed');
    } catch (npmErr) {
      console.warn('[Scaffold] npm install warning (non-fatal):', npmErr.message?.substring(0, 200));
      // Non-fatal — user can run npm install manually
    }

    // ── Step 5: Init git + add template remote + commit everything ──
    console.log('[Scaffold] Step 5/5: Initializing git repo');
    try {
      execSync('git init', { cwd: projectDir, stdio: 'pipe' });
      // Set local git identity (required on some Windows machines with no global config)
      execSync('git config user.email "admin@pennywiseit.com.au"', { cwd: projectDir, stdio: 'pipe' });
      execSync('git config user.name "Penny Wise I.T"', { cwd: projectDir, stdio: 'pipe' });
      // Ensure .gitignore exists
      const gitignorePath = path.join(projectDir, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, 'node_modules/\ndist/\nbuild/\n.env\n.env.local\n', 'utf8');
      }
      // Track the template repo so we can pull updates later
      execSync(`git remote add template "${template.repo}"`, { cwd: projectDir, stdio: 'pipe' });
      execSync('git add -A', { cwd: projectDir, stdio: 'pipe' });
      execSync(`git commit -m "Initial scaffold for ${clientName} — apps: ${appSlugs.join(', ')}"`, {
        cwd: projectDir, stdio: 'pipe'
      });
    } catch (gitErr) {
      console.warn('[Scaffold] Git init warning:', gitErr.message);
    }

    // ── Step 6a: Generate per-client MongoDB database name ──
    const dbSlug = (project.businessName || project.projectName || clientName)
      .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const dbName = `${dbSlug}-db`;
    project.dbName = dbName;
    console.log(`[Scaffold] MongoDB database name: ${dbName} (auto-created on first write)`);

    // ── Step 6b: Optional — create dedicated Atlas DB user per client ──
    if (process.env.MONGODB_ATLAS_PUBLIC_KEY) {
      try {
        const dbPassword = `Pw${Date.now()}${Math.random().toString(36).slice(2, 8)}!`;
        await createAtlasDbUser(dbName, `${dbSlug}-user`, dbPassword);
        console.log(`[Scaffold] ✓ Atlas DB user created for ${dbName}`);
      } catch (atlasErr) {
        console.warn('[Scaffold] Atlas DB user creation failed (non-blocking):', atlasErr.message);
      }
    }

    // ── Step 7: Auto-create GitHub repo + push (if GITHUB_TOKEN is set) ──
    let githubRepoUrl = null;
    if (process.env.GITHUB_TOKEN) {
      console.log('[Scaffold] Step 7: Creating GitHub repo...');
      try {
        const repoSlug = (project.projectName || clientName)
          .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        githubRepoUrl = await createGitHubRepo(
          repoSlug,
          `${clientName} — scaffolded by Penny Wise I.T`
        );
        if (githubRepoUrl) {
          execSync(`git remote add origin "${githubRepoUrl}"`, { cwd: projectDir, stdio: 'pipe' });
          execSync('git push -u origin main', { cwd: projectDir, stdio: 'pipe', timeout: 60000 });
          console.log(`[Scaffold] ✓ GitHub repo created and pushed: ${githubRepoUrl}`);
        }
      } catch (ghErr) {
        console.warn('[Scaffold] GitHub repo creation failed (non-blocking):', ghErr.message);
      }
    } else {
      console.log('[Scaffold] Skipping GitHub repo creation (GITHUB_TOKEN not set)');
    }

    // Update project with local path
    project.localProjectPath = projectDir;
    if (githubRepoUrl) project.deployment.repoUrl = githubRepoUrl;

    // Mark checklist items
    if (project.setupChecklist?.length > 0) {
      const createStep = project.setupChecklist.find(s =>
        s.step.toLowerCase().includes('create customer')
      );
      if (createStep && !createStep.completed) {
        createStep.completed = true;
        createStep.completedAt = new Date();
        createStep.notes = 'Auto-completed by scaffold';
      }
    }

    project.scaffoldPending = false;
    await project.save();
    console.log(`[Scaffold] ✓ Project fully scaffolded at ${projectDir}`);

    res.json({
      message: `Project scaffolded with ${appSlugs.length} app(s)! Dependencies installed. Open in Windsurf to start editing.`,
      localProjectPath: projectDir,
      githubRepoUrl,
      dbName,
      template: primarySlug,
      templateDescription: template.description,
      apps: appSlugs,
      alreadyExists: false
    });

  } catch (err) {
    console.error('[Scaffold] Error:', err);
    res.status(500).json({ message: 'Scaffold failed', error: err.message });
  }
});

// GET scaffold status for a project
router.get('/:projectId/status', auth, adminOnly, async (req, res) => {
  try {
    const project = await ClientProject.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const localPath = project.localProjectPath;
    if (!localPath) {
      return res.json({ scaffolded: false, message: 'No local project path set' });
    }

    const exists = fs.existsSync(localPath);
    const hasFiles = exists && fs.readdirSync(localPath).length > 0;
    const hasPennywiseMeta = exists && fs.existsSync(path.join(localPath, '.pennywise.json'));

    let meta = null;
    if (hasPennywiseMeta) {
      try {
        meta = JSON.parse(fs.readFileSync(path.join(localPath, '.pennywise.json'), 'utf8'));
      } catch (e) {}
    }

    res.json({ scaffolded: hasFiles, exists, hasFiles, hasPennywiseMeta, meta, localPath });
  } catch (err) {
    res.status(500).json({ message: 'Status check failed', error: err.message });
  }
});

// ═══════════════════════════════════════════
// GET default path suggestion for a project
// GET /api/scaffold/:projectId/default-path
// ═══════════════════════════════════════════
router.get('/:projectId/default-path', auth, adminOnly, async (req, res) => {
  try {
    const project = await ClientProject.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const baseDir = process.env.CLIENT_PROJECTS_BASE_DIR
      || path.join(require('os').homedir(), 'OneDrive', 'Desktop', 'Business Folders');
    const clientName = project.businessName || project.projectName;
    const safeName = clientName.replace(/[<>:"/\\|?*]/g, '').trim();
    const defaultPath = path.join(baseDir, safeName, 'App', safeName.replace(/\s+/g, '-'));

    res.json({
      defaultPath,
      existingPath: project.localProjectPath || null,
      clientName,
      apps: project.apps?.map(a => a.slug) || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET all pending scaffolds (admin dashboard)
// GET /api/scaffold/pending
// ═══════════════════════════════════════════
router.get('/pending', auth, adminOnly, async (req, res) => {
  try {
    const pending = await ClientProject.find({ scaffoldPending: true })
      .populate('client', 'firstName lastName email')
      .select('businessName projectName apps scaffoldRequestedAt client localProjectPath');
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════
// SYNC local project — git pull latest
// POST /api/scaffold/:projectId/sync
// ═══════════════════════════════════════════
router.post('/:projectId/sync', auth, adminOnly, async (req, res) => {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return res.status(400).json({ message: 'Sync only works when running locally.' });
  }
  try {
    const project = await ClientProject.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.localProjectPath) return res.status(400).json({ message: 'Project not yet scaffolded.' });

    const projectDir = project.localProjectPath;
    if (!fs.existsSync(projectDir)) {
      return res.status(400).json({ message: 'Local folder not found. Re-scaffold required.' });
    }

    const messages = [];

    // Stage and commit any local uncommitted work first
    try {
      execSync('git add -A', { cwd: projectDir, stdio: 'pipe' });
      const dirty = execSync('git status --porcelain', { cwd: projectDir, stdio: 'pipe' }).toString().trim();
      if (dirty) {
        execSync(`git commit -m "Auto-save before sync — ${new Date().toLocaleString('en-AU')}"`, {
          cwd: projectDir, stdio: 'pipe'
        });
        messages.push('Committed local changes before sync');
      }
    } catch (e) {}

    // Pull from origin if configured
    try {
      const remotes = execSync('git remote', { cwd: projectDir, stdio: 'pipe' }).toString();
      if (remotes.includes('origin')) {
        execSync('git pull origin --rebase', { cwd: projectDir, stdio: 'pipe', timeout: 30000 });
        messages.push('Pulled latest from origin remote');
      } else {
        messages.push('No origin remote — local project is the source of truth');
      }
    } catch (pullErr) {
      messages.push('Pull skipped (no remote changes or up to date)');
    }

    // Get last commit info for display
    let lastCommit = '';
    try {
      lastCommit = execSync('git log -1 --pretty=format:"%s (%cr)"', { cwd: projectDir, stdio: 'pipe' }).toString().trim();
    } catch (e) {}

    res.json({
      synced: true,
      projectDir,
      lastCommit,
      messages,
      windsurfUri: 'windsurf://file/' + projectDir.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/')
    });
  } catch (err) {
    res.status(500).json({ message: 'Sync failed: ' + err.message });
  }
});

// ═══════════════════════════════════════════
// GET available templates + client counts
// GET /api/scaffold/templates/list
// ═══════════════════════════════════════════
router.get('/templates/list', auth, adminOnly, async (req, res) => {
  const templates = Object.entries(TEMPLATES).map(([slug, t]) => ({
    slug, description: t.description, type: t.type, repo: t.repo
  }));

  // Enrich with client counts from DB
  try {
    const projects = await ClientProject.find({}, 'apps localProjectPath businessName projectName');
    const enriched = templates.map(t => {
      const clients = projects.filter(p => p.apps?.some(a => a.slug === t.slug));
      return {
        ...t,
        clientCount: clients.length,
        scaffoldedCount: clients.filter(p => p.localProjectPath).length,
        clients: clients.map(p => ({
          id: p._id,
          name: p.businessName || p.projectName,
          localProjectPath: p.localProjectPath
        }))
      };
    });
    res.json(enriched);
  } catch (e) {
    res.json(templates);
  }
});

// ═══════════════════════════════════════════
// PUSH TEMPLATE UPDATE TO ALL CLIENTS
// POST /api/scaffold/push-update/:appSlug
//
// Safe-merge strategy:
//   1. git fetch template remote
//   2. Stash client-specific files (env, branding, scripts)
//   3. git merge template/main (ours strategy for conflicts)
//   4. Restore client-specific files (env wins always)
//   5. git push to origin (if configured)
// ═══════════════════════════════════════════

// Files/patterns that belong to the client — never overwritten by template updates
const CLIENT_PROTECTED = [
  '.env', '.env.local', '.env.production',
  '.pennywise.json',
  'README.md',
  'scripts/autopush.js',
  'scripts/seed-sample-data.js',
  '.vscode/settings.json',
  '.vscode/tasks.json'
];

router.post('/push-update/:appSlug', auth, adminOnly, async (req, res) => {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return res.status(400).json({ message: 'Update push only works locally.' });
  }

  const { appSlug } = req.params;
  const template = TEMPLATES[appSlug];
  if (!template) {
    return res.status(404).json({ message: `No template for app: ${appSlug}` });
  }

  // Find all scaffolded client projects with this app
  const projects = await ClientProject.find({
    localProjectPath: { $exists: true, $ne: '' }
  }).populate('client', 'firstName lastName');

  const targets = projects.filter(p => p.apps?.some(a => a.slug === appSlug));

  if (targets.length === 0) {
    return res.json({ message: 'No scaffolded client projects for this app.', results: [] });
  }

  const results = [];

  for (const project of targets) {
    const projectDir = project.localProjectPath;
    const clientName = project.businessName || project.projectName;
    const result = { clientName, projectDir, status: 'pending', messages: [] };

    try {
      if (!fs.existsSync(projectDir)) {
        result.status = 'skipped';
        result.messages.push('Project folder not found on disk');
        results.push(result);
        continue;
      }

      // ── 1. Backup protected files ──
      const backups = {};
      for (const rel of CLIENT_PROTECTED) {
        const full = path.join(projectDir, rel);
        if (fs.existsSync(full)) {
          backups[rel] = fs.readFileSync(full, 'utf8');
        }
      }
      result.messages.push(`Backed up ${Object.keys(backups).length} protected file(s)`);

      // ── 2. Ensure template remote exists ──
      try {
        const remotes = execSync('git remote', { cwd: projectDir, stdio: 'pipe' }).toString();
        if (!remotes.includes('template')) {
          execSync(`git remote add template "${template.repo}"`, { cwd: projectDir, stdio: 'pipe' });
        } else {
          execSync(`git remote set-url template "${template.repo}"`, { cwd: projectDir, stdio: 'pipe' });
        }
        result.messages.push('Template remote configured');
      } catch (remoteErr) {
        result.messages.push('Warning: could not set template remote');
      }

      // ── 3. Fetch latest from template ──
      execSync('git fetch template --depth 1', { cwd: projectDir, stdio: 'pipe', timeout: 60000 });
      result.messages.push('Fetched latest from template');

      // ── 4. Create backup branch ──
      const backupBranch = `backup-before-update-${Date.now()}`;
      try {
        execSync(`git branch ${backupBranch}`, { cwd: projectDir, stdio: 'pipe' });
        result.messages.push(`Backup branch created: ${backupBranch}`);
      } catch (e) {}

      // ── 5. Merge template — use 'ours' for conflicts ──
      // Stage any uncommitted changes first
      try {
        execSync('git add -A', { cwd: projectDir, stdio: 'pipe' });
        const dirty = execSync('git status --porcelain', { cwd: projectDir, stdio: 'pipe' }).toString().trim();
        if (dirty) {
          execSync(`git commit -m "Pre-update snapshot — ${new Date().toLocaleString('en-AU')}"`, {
            cwd: projectDir, stdio: 'pipe'
          });
        }
      } catch (e) {}

      try {
        execSync(
          `git merge template/${template.defaultBranch} --allow-unrelated-histories --no-edit -X ours`,
          { cwd: projectDir, stdio: 'pipe', timeout: 60000 }
        );
        result.messages.push('Template merged (client customisations preserved on conflicts)');
      } catch (mergeErr) {
        // Abort merge if it failed
        try { execSync('git merge --abort', { cwd: projectDir, stdio: 'pipe' }); } catch (e) {}
        result.status = 'error';
        result.messages.push('Merge failed: ' + (mergeErr.stderr?.toString().substring(0, 300) || mergeErr.message));
        results.push(result);
        continue;
      }

      // ── 6. Restore protected client files ──
      for (const [rel, content] of Object.entries(backups)) {
        const full = path.join(projectDir, rel);
        const dir = path.dirname(full);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(full, content, 'utf8');
      }
      result.messages.push('Client files restored (.env, scripts, branding)');

      // ── 7. Commit the restored files + update marker ──
      const updateMarker = path.join(projectDir, '.pennywise.json');
      if (fs.existsSync(updateMarker)) {
        try {
          const meta = JSON.parse(fs.readFileSync(updateMarker, 'utf8'));
          meta.lastTemplateUpdate = new Date().toISOString();
          meta.lastTemplateVersion = template.defaultBranch;
          fs.writeFileSync(updateMarker, JSON.stringify(meta, null, 2), 'utf8');
        } catch (e) {}
      }

      execSync('git add -A', { cwd: projectDir, stdio: 'pipe' });
      try {
        execSync(`git commit -m "Template update: ${appSlug} — ${new Date().toLocaleString('en-AU')}"`, {
          cwd: projectDir, stdio: 'pipe'
        });
        result.messages.push('Changes committed');
      } catch (e) {
        result.messages.push('Nothing new to commit (already up to date)');
      }

      // ── 8. Push to origin if remote is configured ──
      try {
        const remotes = execSync('git remote', { cwd: projectDir, stdio: 'pipe' }).toString();
        if (remotes.includes('origin')) {
          execSync('git push origin', { cwd: projectDir, stdio: 'pipe', timeout: 30000 });
          result.messages.push('Pushed to origin remote');
          result.pushed = true;
        } else {
          result.messages.push('No origin remote — changes committed locally only');
          result.pushed = false;
        }
      } catch (pushErr) {
        result.messages.push('Push failed: ' + (pushErr.message?.substring(0, 100)));
        result.pushed = false;
      }

      result.status = 'success';
    } catch (err) {
      result.status = 'error';
      result.messages.push('Error: ' + err.message);
    }

    results.push(result);
    console.log(`[Update] ${clientName}: ${result.status}`);
  }

  const successCount = results.filter(r => r.status === 'success').length;
  res.json({
    message: `Update complete: ${successCount}/${results.length} clients updated`,
    appSlug,
    results
  });
});

// ═══════════════════════════════════════════
// GET windsurf URI for a template
// GET /api/scaffold/templates/:appSlug/open
// ═══════════════════════════════════════════
router.get('/templates/:appSlug/open', auth, adminOnly, (req, res) => {
  const { appSlug } = req.params;
  const template = TEMPLATES[appSlug];
  if (!template) return res.status(404).json({ message: 'Template not found' });

  // For pennywise-module apps, the template IS the running project dir.
  // Prefer PROJECT_ROOT env var — __dirname resolves to /var/task/ on deployed servers.
  const mainProjectDir = process.env.PROJECT_ROOT || path.resolve(__dirname, '..', '..');
  const localPath = template.type === 'pennywise-module' ? mainProjectDir : null;

  res.json({
    appSlug,
    type: template.type,
    repo: template.repo,
    localPath,
    windsurfUri: localPath
      ? 'windsurf://file/' + localPath.replace(/\\/g, '/').split('/').map(s => encodeURIComponent(s)).join('/')
      : null
  });
});

module.exports = router;
