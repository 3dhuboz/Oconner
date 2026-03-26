// Use Google DNS locally to resolve MongoDB Atlas SRV records (skip on Vercel)
if (!process.env.VERCEL) {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://pennywiseit.com.au', 'https://www.pennywiseit.com.au', /\.vercel\.app$/]
    : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Square webhook — bypass CORS (Square servers won't match our origins)
app.options('/api/square/webhook', (req, res) => res.sendStatus(200));
app.use('/api/square/webhook', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Capture raw body for Square webhook signature verification (must come before JSON parser)
app.use('/api/square/webhook', express.json({
  limit: '1mb',
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection — cached for serverless (Vercel cold starts)
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pennywise-it';

async function connectDB() {
  if (dbConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    dbConnected = true;
    console.log('MongoDB connected successfully');
    // Auto-seed marketplace apps (upsert)
    const AppDefinition = require('./models/AppDefinition');
    const seedApps = [
      {
        slug: 'social-ai-studio',
        name: 'SocialAI Studio',
        shortDescription: 'Research-driven AI social media manager. Analyses your real engagement data to create smarter content strategies.',
        fullDescription: 'SocialAI Studio uses Google Gemini 2.5 AI to analyse your real Facebook and Instagram engagement data — top-performing posts, best days, winning hashtags — then builds data-driven content schedules that replicate what actually works for your audience. Features include AI content generation, AI image creation, insights-to-schedule workflow, evolving best practices knowledge hub, and full white-label branding.',
        icon: 'sparkles',
        category: 'marketing',
        routePath: '/social',
        setupFee: 299,
        features: ['Research-Driven AI Engine', 'AI Content Generation', 'AI Image Generation', 'AI Video Generation (Runway ML)', 'Data-Backed Smart Scheduler', 'Insights-to-Schedule Workflow', 'Performance Intelligence', 'Evolving Best Practices Hub', 'Multi-Platform (Facebook & Instagram)', 'White-Label Branding'],
        techStack: ['Google Gemini 2.5 AI', 'React', 'Node.js', 'MongoDB', 'Facebook Graph API'],
        plans: [
          { key: 'starter', name: 'Starter', price: 49, yearlyPrice: 490, features: ['AI Content Generation', 'Content Calendar & Scheduling', 'AI-Powered Insights', 'Best Practices Knowledge Hub', 'Brand Profile & Voice Setup', '1 Brand Profile'], color: '#3b82f6', whiteLabel: false, customDomain: false },
          { key: 'professional', name: 'Professional', price: 99, yearlyPrice: 990, features: ['Everything in Starter', 'Research-Driven Smart Scheduler', 'AI Analyses Past Post Performance', 'Data-Backed Best Days & Times', 'Schedule Directly from Insights', 'AI Marketing Image Generation', 'AI Promotional Video Creation', 'Full White-Label Branding', '3 Brand Profiles'], popular: true, color: '#f59e0b', whiteLabel: true, customDomain: false },
          { key: 'enterprise', name: 'Enterprise', price: 199, yearlyPrice: 1990, features: ['Everything in Professional', 'Custom Domain', 'Priority Support', 'API Access', 'Unlimited Brand Profiles', 'Dedicated Account Manager'], color: '#a855f7', whiteLabel: true, customDomain: true }
        ],
        isActive: true, isPublished: true, displayOrder: 1
      },
      {
        slug: 'foodtruc',
        name: 'Food Truck',
        shortDescription: 'White-label mobile ordering platform for food trucks, caterers, and pop-up kitchens. Online ordering, payments, AI assistant, and loyalty — all under your brand.',
        fullDescription: 'Food Truck is a fully-featured, mobile-first ordering web app purpose-built for food trucks, BBQ vendors, caterers, and pop-up kitchens. Customers can browse your menu, place takeaway or catering orders, pay via Square, track deliveries, and earn loyalty stamps — all from a PWA that works offline. The admin dashboard gives you full control over orders, menu items, cook-day planner, customer database, email/SMS blasts, social content generation, and AI-powered chat assistance. Every element — colours, logos, business name, images — is white-label configurable so it looks 100% yours.',
        icon: 'zap',
        category: 'food-service',
        routePath: '/foodtruck-app',
        setupFee: 499,
        features: ['Online Ordering (Takeaway & Catering)', 'DIY Catering Builder', 'Square Payment Integration', 'AI Chat Assistant (Gemini + Claude)', 'Admin Dashboard & Order Management', 'Loyalty Rewards Program', 'Email & SMS Notifications', 'Cook-Day Planner & Events Calendar', 'Customer Gallery with Moderation', 'PWA — Installable & Offline Ready', 'Full White-Label Branding', 'Delivery Tracking'],
        techStack: ['React 19', 'TypeScript', 'Firebase', 'Square Payments', 'Google Gemini AI', 'Twilio SMS', 'Vite', 'TailwindCSS'],
        plans: [
          { key: 'starter', name: 'Starter', price: 79, yearlyPrice: 790, features: ['Online Menu & Ordering', 'Square Payments', 'Order Management Dashboard', 'Cook-Day Planner', 'Email Notifications', '1 Location'], color: '#10b981', whiteLabel: false, customDomain: false },
          { key: 'professional', name: 'Professional', price: 149, yearlyPrice: 1490, features: ['Everything in Starter', 'DIY Catering Builder', 'Loyalty Rewards Program', 'SMS Notifications (Twilio)', 'AI Chat Assistant', 'Customer Gallery', 'Full White-Label Branding', '3 Locations'], popular: true, color: '#f59e0b', whiteLabel: true, customDomain: false },
          { key: 'enterprise', name: 'Enterprise', price: 299, yearlyPrice: 2990, features: ['Everything in Professional', 'Custom Domain', 'Multi-Location Management', 'Priority Support', 'AI Social Content Generator', 'Advanced Analytics', 'Dedicated Account Manager', 'Unlimited Locations'], color: '#a855f7', whiteLabel: true, customDomain: true }
        ],
        isActive: true, isPublished: true, displayOrder: 2
      },
      {
        slug: 'autohue',
        name: 'AutoHue',
        shortDescription: 'AI-powered car photo colour sorter. Upload vehicle photos and let AI detect cars, identify colours, and sort them into organised folders instantly.',
        fullDescription: 'AutoHue uses YOLOv8 neural networks and K-means colour clustering to automatically detect vehicles in photos, extract the dominant colour, and sort images into 11 colour-coded folders. Perfect for car dealerships, automotive photographers, and auction houses who need to organise thousands of vehicle photos quickly. Upload in bulk, download sorted results as a ZIP. White-label it with your own branding for your business or clients.',
        icon: 'palette',
        category: 'automotive',
        routePath: '/autohue',
        demoUrl: 'https://autohue.app',
        setupFee: 199,
        features: ['AI Car Detection (YOLOv8)', 'Dominant Colour Extraction', '11 Colour Categories', 'Bulk Photo Upload', 'Automatic Folder Sorting', 'ZIP Download Export', 'Real-Time Processing Status', 'White-Label Branding', 'API Access'],
        techStack: ['YOLOv8', 'PyTorch', 'OpenCV', 'K-Means Clustering', 'React', 'Vercel'],
        plans: [
          { key: 'starter', name: 'Starter', price: 29, yearlyPrice: 290, features: ['Up to 500 photos/month', 'AI Car Detection', '11 Colour Categories', 'ZIP Export', 'Email Support'], color: '#06b6d4', whiteLabel: false, customDomain: false },
          { key: 'professional', name: 'Professional', price: 69, yearlyPrice: 690, features: ['Everything in Starter', 'Unlimited Photos', 'API Access', 'Batch Processing', 'White-Label Branding', 'Priority Processing'], popular: true, color: '#f59e0b', whiteLabel: true, customDomain: false },
          { key: 'enterprise', name: 'Enterprise', price: 149, yearlyPrice: 1490, features: ['Everything in Professional', 'Custom Domain', 'Custom Colour Categories', 'Dedicated Support', 'SLA-Backed Uptime', 'Multi-User Access'], color: '#a855f7', whiteLabel: true, customDomain: true }
        ],
        isActive: true, isPublished: true, displayOrder: 3
      },
      {
        slug: 'wirez',
        name: 'Wirez',
        shortDescription: 'End-to-end electrician workflow app. Job intake, dispatch, field capture, Xero invoicing — all under your brand.',
        fullDescription: 'Wirez is a purpose-built operational workflow system for electricians and electrical contractors. Manage the entire job lifecycle from work order intake through tenant contact, scheduling, dispatch, on-site field capture (labour, materials, photos), and automatic Xero invoice generation. Features a Kanban jobs board, real-time status tracking, pre-departure checklists, and full admin oversight. Each subscriber gets their own isolated Firebase instance for complete data privacy. White-label it with your business name, colours, and branding — your customers will never know it\'s powered by Penny Wise I.T.',
        icon: 'bolt',
        category: 'trades',
        routePath: '/wirez',
        heroImage: '/app-previews/wirez-preview.svg',
        setupFee: 399,
        features: ['Job Intake & Work Orders', 'Tenant Contact Tracking', 'Entry Notice Management', 'Kanban Jobs Board', 'Electrician Dispatch', 'Field Capture (Labour, Materials, Photos)', 'Xero Invoice Generation', 'Admin Notes & Timeline', 'Pre-Departure Checklists', 'Firebase Per-Tenant Isolation', 'Full White-Label Branding', 'Web & Mobile Ready'],
        techStack: ['React', 'Firebase', 'Firestore', 'Firebase Auth', 'Firebase Storage', 'Xero API', 'Vite'],
        plans: [
          { key: 'starter', name: 'Starter', price: 59, yearlyPrice: 590, features: ['Job Management', 'Kanban Board', 'Field Capture', 'Up to 50 Jobs/Month', 'Email Support'], color: '#f59e0b', whiteLabel: false, customDomain: false },
          { key: 'professional', name: 'Professional', price: 119, yearlyPrice: 1190, features: ['Everything in Starter', 'Unlimited Jobs', 'Xero Integration', 'Photo Storage', 'White-Label Branding', 'Priority Support'], popular: true, color: '#f59e0b', whiteLabel: true, customDomain: false },
          { key: 'enterprise', name: 'Enterprise', price: 249, yearlyPrice: 2490, features: ['Everything in Professional', 'Custom Domain', 'Multi-User Access', 'Dedicated Firebase Instance', 'SLA-Backed Uptime', 'Dedicated Account Manager'], color: '#a855f7', whiteLabel: true, customDomain: true }
        ],
        isActive: true, isPublished: true, displayOrder: 4
      },
      {
        slug: 'simple-website',
        name: 'SimpleWebsite',
        shortDescription: 'White-label e-commerce website with storefront, shopping cart, admin dashboard, AI content generation, and optional SocialAI add-on. Deploy a fully branded online store in minutes.',
        fullDescription: 'SimpleWebsite is a complete, production-ready e-commerce platform built with React 19, TypeScript, Cloudflare Workers, and D1. It includes a beautiful storefront with hero section, product grid, category browsing, and product detail pages. Customers can create accounts, add items to a cart, and checkout via Square payments with weight-based shipping calculation. The admin dashboard provides full control over inventory, orders, customers, CMS content, inbox, and site-wide branding. AI-powered product descriptions, images, and social media content generation are built in. Every element — colours, logos, images, text — is white-label configurable through the built-in CMS. The optional SocialAI Studio add-on (Professional plan and above) unlocks AI-powered social media scheduling and publishing directly to Facebook.',
        icon: 'globe',
        category: 'ecommerce',
        routePath: '/simple-website',
        demoUrl: 'https://www.pennywiseit.com.au/simple-website',
        heroImage: '/app-previews/simplewebsite-preview.svg',
        setupFee: 199,
        features: ['Beautiful Storefront & Product Pages', 'Shopping Cart & Square Checkout', 'Weight-Based Shipping Calculator', 'Customer Accounts (Clerk Auth)', 'Admin Dashboard & Order Management', 'Full CMS — Edit All Content & Branding', 'AI Product Descriptions & Images', 'Inventory & Category Management', 'Contact Form & Admin Inbox', 'GST/Tax Configuration', 'Email Notifications (Resend)', 'Order Tracking & Shipping Notifications', 'Facebook Social Scheduling', 'PWA — Installable as Native App', 'Responsive Mobile-First Design', 'Full White-Label Branding'],
        techStack: ['React 19', 'TypeScript', 'Cloudflare Workers', 'D1 (SQLite)', 'R2 Storage', 'Clerk Auth', 'Square Payments', 'Resend Email', 'OpenRouter AI', 'Vite', 'TailwindCSS'],
        plans: [
          { key: 'starter', name: 'Starter', price: 39, yearlyPrice: 390, features: ['Full E-Commerce Storefront', 'Shopping Cart & Checkout', 'Admin Dashboard', 'CMS Content Editor', 'Order Management', 'Customer Accounts', 'Email Notifications', '1 Store'], color: '#10b981', whiteLabel: false, customDomain: false },
          { key: 'professional', name: 'Professional', price: 79, yearlyPrice: 790, features: ['Everything in Starter', 'SocialAI Studio Add-On', 'AI Content Generation', 'AI Image Creation', 'Smart Post Scheduler', 'Engagement Insights', 'Full White-Label Branding', '3 Stores'], popular: true, color: '#f59e0b', whiteLabel: true, customDomain: false },
          { key: 'enterprise', name: 'Enterprise', price: 159, yearlyPrice: 1590, features: ['Everything in Professional', 'Custom Domain', 'Priority Support', 'API Access', 'Multi-Store Management', 'Dedicated Account Manager', 'SLA-Backed Uptime', 'Unlimited Stores'], color: '#a855f7', whiteLabel: true, customDomain: true }
        ],
        isActive: true, isPublished: true, displayOrder: 5
      },
      {
        slug: 'roblox-forge',
        name: 'RobloxForge',
        shortDescription: 'AI-powered desktop app to build and publish Roblox games with chat assistance — no Studio required.',
        fullDescription: 'RobloxForge is an AI-assisted desktop application that empowers creators to design, build, and publish Roblox games without needing Roblox Studio. Choose from five professional game templates (Obby, Tycoon, Simulator, Battlegrounds, RPG), describe your vision in plain English, and let AI generate complete Luau scripts and game structure. Edit with the built-in script editor, preview your layout with the visual stage map, validate automatically before publishing, then upload directly to Roblox via One-Click Publish. Perfect for indie developers, educational creators, and aspiring game designers aged 14+.',
        icon: 'gamepad-2',
        category: 'game-development',
        routePath: null,
        demoUrl: 'https://www.pennywiseit.com.au/roblox-forge',
        setupFee: 0,
        deliveryType: 'download',
        features: ['5 Game Templates (Obby, Tycoon, Simulator, Battlegrounds, RPG)', 'AI Chat Assistant Powered by Claude', 'Guided Wizard for Beginners', 'Built-In Luau Script Editor with Syntax Highlighting', 'Visual 2D Stage Map Preview', 'Roblox Hierarchy Explorer', '8 Automated Pre-Publish Validation Checks', 'Roblox OAuth 2.0 Authentication', 'One-Click Publish to Roblox', 'Analytics Dashboard (Visits, Players, Robux)', 'Adaptive UI (Beginner/Intermediate/Advanced)', 'Desktop App — Windows & Mac'],
        techStack: ['Tauri v2 (Rust)', 'React 19', 'TypeScript', 'TailwindCSS', 'Claude AI', 'Roblox Open Cloud API', 'Rojo Build System'],
        plans: [
          { key: 'starter', name: 'Starter', price: 0, yearlyPrice: 0, features: ['3 Game Templates (Obby, Tycoon, Simulator)', '50 AI Chats/Month', 'Basic Validation', 'Roblox Publishing', 'Community Support'], color: '#10b981', whiteLabel: false, customDomain: false },
          { key: 'professional', name: 'Professional', price: 9.99, yearlyPrice: 89.99, features: ['All 5 Templates', 'Unlimited AI Chats', 'Advanced Validation', 'Priority Publishing', 'Script Editor Pro Features', 'Priority Support'], popular: true, color: '#f59e0b', whiteLabel: false, customDomain: false },
          { key: 'enterprise', name: 'Enterprise', price: 29.99, yearlyPrice: 299.99, features: ['Everything in Professional', 'Custom Templates', 'Team Collaboration (2-5 Users)', 'API Access', 'White-Label Branding', 'Dedicated Support'], color: '#a855f7', whiteLabel: true, customDomain: false }
        ],
        isActive: true, isPublished: true, displayOrder: 6
      }
    ];
    const validSlugs = seedApps.map(a => a.slug);
    for (const appData of seedApps) {
      await AppDefinition.findOneAndUpdate({ slug: appData.slug }, { $set: appData }, { upsert: true, new: true });
    }
    // Remove stale app definitions (e.g. old 'simplewebsite' slug renamed to 'simple-website')
    await AppDefinition.deleteMany({ slug: { $nin: validSlugs } });
    console.log(`Marketplace apps synced (${seedApps.length} apps)`);

    // Auto-seed admin user ONLY if none exists
    // For existing admin, only sync role/isActive — NEVER touch password on boot
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pennywiseit.com.au').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      // First-time only: hash password and insert directly (bypass Mongoose pre-save)
      const salt = await bcrypt.genSalt(10);
      const hashedPw = await bcrypt.hash(adminPassword, salt);
      await User.collection.insertOne({
        firstName: 'Admin',
        lastName: 'PennyWise',
        email: adminEmail,
        password: hashedPw,
        role: 'admin',
        company: 'Penny Wise I.T',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Existing admin: only ensure role + active status, do NOT touch password
      await User.updateOne(
        { _id: adminUser._id },
        { $set: { role: 'admin', isActive: true } }
      );
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    dbConnected = false;
    throw err;
  }
}

// Ensure DB is connected before handling any API request
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database connection failed', error: err.message });
  }
});

// For non-serverless (local dev), connect immediately
if (!process.env.VERCEL) {
  connectDB().catch(err => console.error('Initial DB connect failed:', err.message));
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/siteground', require('./routes/siteground'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/social', require('./routes/social'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/hosting', require('./routes/hosting'));
app.use('/api/client-projects', require('./routes/clientProjects'));
app.use('/api/scaffold', require('./routes/scaffold'));
app.use('/api/foodtruck/customers', require('./routes/foodtruck-customers'));
app.use('/api/foodtruck/subscriptions', require('./routes/foodtruck-subscriptions'));
app.use('/api/foodtruck/promo-codes', require('./routes/foodtruck-promo'));
app.use('/api/foodtruck/stock', require('./routes/foodtruck-stock'));
app.use('/api/foodtruck/delivery', require('./routes/foodtruck-delivery'));
app.use('/api/foodtruck/suppliers', require('./routes/foodtruck-suppliers'));
app.use('/api/foodtruck', require('./routes/foodtruck'));
app.use('/api/simplewebsite', require('./routes/simplewebsite'));
app.use('/api/square', require('./routes/squareWebhook'));

// Public config endpoint — exposes client-mode settings for the React app
app.get('/api/config', (req, res) => {
  res.json({
    clientMode: process.env.CLIENT_MODE === 'true',
    enabledApps: process.env.ENABLED_APPS ? process.env.ENABLED_APPS.split(',').map(s => s.trim()) : [],
    brandName: process.env.BRAND_NAME || '',
    brandTagline: process.env.BRAND_TAGLINE || '',
    primaryColor: process.env.PRIMARY_COLOR || '#7c3aed',
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  // Cache static assets (JS/CSS use content hashing) but NOT index.html
  app.use(express.static(path.join(__dirname, '../client/build'), {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Vercel: export only, no listen(). Passenger: use passenger socket. Otherwise: normal listen.
if (process.env.VERCEL) {
  // Vercel serverless — do not call listen()
} else if (typeof(PhusionPassenger) !== 'undefined') {
  app.listen('passenger');
  console.log('Penny Wise I.T running via Phusion Passenger');
} else {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Penny Wise I.T server running on port ${PORT}`);
  });
}

module.exports = app;
