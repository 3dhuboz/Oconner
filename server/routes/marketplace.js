const express = require('express');
const AppDefinition = require('../models/AppDefinition');
const AppSubscription = require('../models/AppSubscription');
const ClientProject = require('../models/ClientProject');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');
const { sendEmail, subscriptionConfirmationEmail, adminNotificationEmail } = require('../utils/email');
const { findOrCreateSquareCustomer, createSquareInvoice, publishSquareInvoice } = require('../utils/square');

// Default checklist for auto-created projects
const DEFAULT_CHECKLIST = [
  { step: 'Create customer account in Admin → Customers', completed: false },
  { step: 'Issue app licenses (Admin → Customers → Issue License)', completed: false },
  { step: 'Scaffold project in Windsurf (auto-triggered on purchase)', completed: false },
  { step: 'Create new Render Web Service from same GitHub repo', completed: false },
  { step: 'Configure Render env vars (MONGODB_URI, JWT_SECRET, etc.)', completed: false },
  { step: 'Create separate MongoDB database/cluster for client', completed: false },
  { step: 'Configure white-label branding (logo, colors, name)', completed: false },
  { step: 'Test client login and app functionality', completed: false },
  { step: 'Send client their login credentials', completed: false },
  { step: 'Create initial invoice via Square', completed: false }
];

const router = express.Router();

// ══════════════════════════════════════════════
// PUBLIC — Browse Apps
// ══════════════════════════════════════════════

// Slugs reserved for the internal Pennywise IT platform — never offered to customers
const INTERNAL_SLUGS = ['pennywise', 'pennywise-it', 'penny-wise', 'admin', 'platform'];
const isInternal = (slug) => INTERNAL_SLUGS.some(s => slug?.toLowerCase().includes(s));

// List all published apps
router.get('/apps', async (req, res) => {
  try {
    const apps = await AppDefinition.find({ isActive: true, isPublished: true }).sort('displayOrder');
    res.json(apps.filter(a => !isInternal(a.slug)));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single app by slug
router.get('/apps/:slug', async (req, res) => {
  try {
    if (isInternal(req.params.slug)) return res.status(404).json({ message: 'App not found' });
    const app = await AppDefinition.findOne({ slug: req.params.slug, isActive: true });
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ══════════════════════════════════════════════
// CUSTOMER — Subscriptions
// ══════════════════════════════════════════════

// Get all my subscriptions
router.get('/my-apps', auth, async (req, res) => {
  try {
    const subs = await AppSubscription.find({ user: req.user._id })
      .populate('app');
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get my subscription for a specific app
router.get('/my-apps/:appSlug', auth, async (req, res) => {
  try {
    const appDef = await AppDefinition.findOne({ slug: req.params.appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });
    const sub = await AppSubscription.findOne({ user: req.user._id, app: appDef._id }).populate('app');
    res.json(sub || { subscribed: false, app: appDef });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Purchase / subscribe to an app
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { appSlug, planKey, billingInterval = 'monthly' } = req.body;
    const appDef = await AppDefinition.findOne({ slug: appSlug, isActive: true });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const plan = appDef.plans.find(p => p.key === planKey);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const now = new Date();
    const isYearly = billingInterval === 'yearly';
    const endDate = isYearly
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const amount = isYearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

    // Check if setup fee already paid
    const existingSub = await AppSubscription.findOne({ user: req.user._id, app: appDef._id });
    const setupFeePaid = existingSub?.setupFeePaid || false;
    const setupFee = appDef.setupFee || 0;

    const sub = await AppSubscription.findOneAndUpdate(
      { user: req.user._id, app: appDef._id },
      {
        user: req.user._id,
        app: appDef._id,
        planKey: plan.key,
        billingInterval: isYearly ? 'yearly' : 'monthly',
        status: 'active',
        startDate: now,
        endDate,
        lastPayment: now,
        amount,
        setupFeePaid: true,
        setupFeeAmount: setupFeePaid ? 0 : setupFee,
        currency: plan.currency || 'AUD'
      },
      { new: true, upsert: true }
    ).populate('app');

    // Get user details for emails
    const customer = await User.findById(req.user._id);
    const userName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || customer?.email || 'Customer';

    // Create Square invoice for payment collection (non-blocking)
    (async () => {
      try {
        const sqCustomer = await findOrCreateSquareCustomer({
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          company: customer.company,
          phone: customer.phone
        });
        if (sqCustomer) {
          const lineItems = [];
          if (!setupFeePaid && setupFee > 0) {
            lineItems.push({ description: `${appDef.name} — One-Time Setup Fee`, quantity: 1, unitPrice: setupFee });
          }
          lineItems.push({ description: `${appDef.name} — ${plan.name} Plan (${isYearly ? 'Yearly' : 'Monthly'})`, quantity: 1, unitPrice: amount });

          const invoiceNum = `PW-${appDef.slug.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`;
          const result = await createSquareInvoice({
            squareCustomerId: sqCustomer.id,
            lineItems,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
            title: `${appDef.name} Subscription`,
            invoiceNumber: invoiceNum
          });
          if (result?.invoice) {
            await publishSquareInvoice(result.invoice.id, result.invoice.version);
            console.log(`[Square] Invoice ${invoiceNum} created & published for ${customer.email}`);
            // Store invoice reference on subscription
            await AppSubscription.findByIdAndUpdate(sub._id, { squareInvoiceId: result.invoice.id });
          }
        }
      } catch (sqErr) {
        console.error('[Square] Invoice creation failed (non-blocking):', sqErr.message);
      }
    })();

    // Send confirmation email to customer (non-blocking)
    sendEmail({
      to: customer.email,
      subject: `Subscription Confirmed — ${appDef.name} (${plan.name})`,
      html: subscriptionConfirmationEmail({
        userName,
        appName: appDef.name,
        planName: plan.name,
        amount,
        billingInterval: isYearly ? 'yearly' : 'monthly',
        setupFee,
        setupFeePaid
      })
    }).catch(err => console.error('[Email] Customer confirmation failed:', err.message));

    // Notify admin (non-blocking)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pennywiseit.com.au';
    sendEmail({
      to: adminEmail,
      subject: `💰 New Subscription: ${appDef.name} — ${plan.name} (${userName})`,
      html: adminNotificationEmail({
        userName,
        userEmail: customer.email,
        appName: appDef.name,
        planName: plan.name,
        amount,
        billingInterval: isYearly ? 'yearly' : 'monthly',
        setupFee: setupFeePaid ? 0 : setupFee
      })
    }).catch(err => console.error('[Email] Admin notification failed:', err.message));

    // Auto-create / update ClientProject for this subscriber (non-blocking)
    (async () => {
      try {
        const appEntry = { slug: appDef.slug, name: appDef.name, subscription: sub._id, planKey: plan.key };
        let project = await ClientProject.findOne({ client: customer._id });
        if (!project) {
          // Create new project
          const businessName = customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email;
          project = new ClientProject({
            client: customer._id,
            projectName: `${businessName} — ${appDef.name}`,
            businessName,
            contactName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
            contactEmail: customer.email,
            contactPhone: customer.phone || '',
            apps: [appEntry],
            scaffoldPending: true,
            scaffoldRequestedAt: new Date(),
            setupChecklist: DEFAULT_CHECKLIST,
            status: 'setup'
          });
        } else {
          // Add app if not already in project
          const already = project.apps.some(a => a.slug === appDef.slug);
          if (!already) project.apps.push(appEntry);
          project.scaffoldPending = true;
          project.scaffoldRequestedAt = new Date();
        }
        await project.save();
        console.log(`[Marketplace] ClientProject auto-created/updated for ${customer.email} — ${appDef.slug}`);
      } catch (projErr) {
        console.error('[Marketplace] ClientProject auto-create failed:', projErr.message);
      }
    })();

    const intervalLabel = isYearly ? 'year' : 'month';
    const setupMsg = !setupFeePaid && setupFee > 0 ? ` Setup fee: $${setupFee}.` : '';
    res.json({
      message: `${plan.name} plan activated for ${appDef.name}! ($${amount}/${intervalLabel})${setupMsg} Confirmation email sent.`,
      subscription: sub
    });
  } catch (err) {
    res.status(500).json({ message: 'Subscription failed', error: err.message });
  }
});

// Upgrade plan
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { appSlug, planKey } = req.body;
    const appDef = await AppDefinition.findOne({ slug: appSlug, isActive: true });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const plan = appDef.plans.find(p => p.key === planKey);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const sub = await AppSubscription.findOneAndUpdate(
      { user: req.user._id, app: appDef._id },
      { planKey: plan.key, amount: plan.price, lastPayment: new Date() },
      { new: true }
    ).populate('app');

    if (!sub) return res.status(404).json({ message: 'No subscription found for this app' });

    res.json({ message: `Upgraded to ${plan.name}!`, subscription: sub });
  } catch (err) {
    res.status(500).json({ message: 'Upgrade failed', error: err.message });
  }
});

// Cancel subscription
router.post('/cancel', auth, async (req, res) => {
  try {
    const { appSlug } = req.body;
    const appDef = await AppDefinition.findOne({ slug: appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const sub = await AppSubscription.findOneAndUpdate(
      { user: req.user._id, app: appDef._id },
      { status: 'cancelled' },
      { new: true }
    ).populate('app');

    if (!sub) return res.status(404).json({ message: 'No subscription found' });

    res.json({ message: 'Subscription cancelled. Access remains until end of billing period.', subscription: sub });
  } catch (err) {
    res.status(500).json({ message: 'Cancellation failed', error: err.message });
  }
});

// ══════════════════════════════════════════════
// CUSTOMER — White-Label
// ══════════════════════════════════════════════

// Get white-label settings for an app subscription
router.get('/white-label/:appSlug', auth, async (req, res) => {
  try {
    const appDef = await AppDefinition.findOne({ slug: req.params.appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const sub = await AppSubscription.findOne({ user: req.user._id, app: appDef._id });
    if (!sub || !sub.isActive) return res.status(403).json({ message: 'Active subscription required' });

    const plan = appDef.plans.find(p => p.key === sub.planKey);
    if (!plan?.whiteLabel) return res.status(403).json({ message: 'White-label requires a higher plan' });

    res.json(sub.whiteLabel);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update white-label settings
router.put('/white-label/:appSlug', auth, async (req, res) => {
  try {
    const appDef = await AppDefinition.findOne({ slug: req.params.appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const sub = await AppSubscription.findOne({ user: req.user._id, app: appDef._id });
    if (!sub || !sub.isActive) return res.status(403).json({ message: 'Active subscription required' });

    const plan = appDef.plans.find(p => p.key === sub.planKey);
    if (!plan?.whiteLabel) return res.status(403).json({ message: 'White-label requires a higher plan' });

    const allowed = ['brandName', 'tagline', 'logoUrl', 'faviconUrl', 'primaryColor', 'accentColor', 'headerBg', 'buttonColor', 'fontFamily', 'hideByline'];
    if (plan?.customDomain) allowed.push('customDomain');

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[`whiteLabel.${key}`] = req.body[key];
    }

    const updated = await AppSubscription.findByIdAndUpdate(sub._id, updates, { new: true });
    res.json(updated.whiteLabel);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update branding', error: err.message });
  }
});

// ══════════════════════════════════════════════
// ADMIN — App Management
// ══════════════════════════════════════════════

// List all apps (including unpublished)
router.get('/admin/apps', auth, adminOnly, async (req, res) => {
  try {
    const apps = await AppDefinition.find().sort('displayOrder');
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a new app
router.post('/admin/apps', auth, adminOnly, async (req, res) => {
  try {
    const app = new AppDefinition({ ...req.body, createdBy: req.user._id });
    await app.save();
    res.status(201).json(app);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create app', error: err.message });
  }
});

// Update an app
router.put('/admin/apps/:id', auth, adminOnly, async (req, res) => {
  try {
    const app = await AppDefinition.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update app', error: err.message });
  }
});

// Delete an app
router.delete('/admin/apps/:id', auth, adminOnly, async (req, res) => {
  try {
    await AppDefinition.findByIdAndDelete(req.params.id);
    res.json({ message: 'App deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Seed initial apps (SocialAI Studio as first app)
router.post('/admin/seed', auth, adminOnly, async (req, res) => {
  try {
    const apps = [
      {
        slug: 'social-ai-studio',
        name: 'SocialAI Studio',
        shortDescription: 'Research-driven AI social media manager. Analyses your real engagement data to create smarter content strategies.',
        fullDescription: 'SocialAI Studio uses Google Gemini 2.5 AI to analyse your real Facebook and Instagram engagement data — top-performing posts, best days, winning hashtags — then builds data-driven content schedules that replicate what actually works for your audience. Features include AI content generation, AI image creation, insights-to-schedule workflow, evolving best practices knowledge hub, and full white-label branding.',
        icon: 'sparkles',
        category: 'marketing',
        routePath: '/social',
        features: [
          'Research-Driven AI Engine',
          'AI Content Generation',
          'AI Image Generation',
          'AI Video Generation (Runway ML)',
          'Data-Backed Smart Scheduler',
          'Insights-to-Schedule Workflow',
          'Performance Intelligence',
          'Evolving Best Practices Hub',
          'Multi-Platform (Facebook & Instagram)',
          'White-Label Branding'
        ],
        techStack: ['Google Gemini 2.5 AI', 'React', 'Node.js', 'MongoDB', 'Facebook Graph API'],
        plans: [
          {
            key: 'starter',
            name: 'Starter',
            price: 49,
            features: ['AI Content Generation', 'Content Calendar & Scheduling', 'AI-Powered Insights', 'Best Practices Knowledge Hub', 'Brand Profile & Voice Setup', '1 Brand Profile'],
            color: '#3b82f6',
            whiteLabel: false,
            customDomain: false
          },
          {
            key: 'professional',
            name: 'Professional',
            price: 99,
            features: ['Everything in Starter', 'Research-Driven Smart Scheduler', 'AI Analyses Past Post Performance', 'Data-Backed Best Days & Times', 'Schedule Directly from Insights', 'AI Marketing Image Generation', 'AI Promotional Video Creation', 'Full White-Label Branding', '3 Brand Profiles'],
            popular: true,
            color: '#f59e0b',
            whiteLabel: true,
            customDomain: false
          },
          {
            key: 'enterprise',
            name: 'Enterprise',
            price: 199,
            features: ['Everything in Professional', 'Custom Domain', 'Priority Support', 'API Access', 'Unlimited Brand Profiles', 'Dedicated Account Manager'],
            color: '#a855f7',
            whiteLabel: true,
            customDomain: true
          }
        ],
        displayOrder: 1
      },
      {
        slug: 'foodtruc',
        name: 'Food Truck',
        shortDescription: 'White-label mobile ordering platform for food trucks, caterers, and pop-up kitchens. Online ordering, payments, AI assistant, and loyalty — all under your brand.',
        fullDescription: 'Food Truck is a fully-featured, mobile-first ordering web app purpose-built for food trucks, BBQ vendors, caterers, and pop-up kitchens. Customers can browse your menu, place takeaway or catering orders, pay via Square, track deliveries, and earn loyalty stamps — all from a PWA that works offline. The admin dashboard gives you full control over orders, menu items, cook-day planner, customer database, email/SMS blasts, social content generation, and AI-powered chat assistance. Every element is white-label configurable.',
        icon: 'zap',
        category: 'food-service',
        routePath: '/foodtruck-app',
        features: [
          'Online Ordering (Takeaway & Catering)',
          'DIY Catering Builder',
          'Square Payment Integration',
          'AI Chat Assistant (Gemini + Claude)',
          'Admin Dashboard & Order Management',
          'Loyalty Rewards Program',
          'Email & SMS Notifications',
          'Cook-Day Planner & Events Calendar',
          'Customer Gallery with Moderation',
          'PWA — Installable & Offline Ready',
          'Full White-Label Branding',
          'Delivery Tracking'
        ],
        techStack: ['React 19', 'TypeScript', 'Firebase', 'Square Payments', 'Google Gemini AI', 'Twilio SMS', 'Vite', 'TailwindCSS'],
        plans: [
          {
            key: 'starter',
            name: 'Starter',
            price: 79,
            features: ['Online Menu & Ordering', 'Square Payments', 'Order Management Dashboard', 'Cook-Day Planner', 'Email Notifications', '1 Location'],
            color: '#10b981',
            whiteLabel: false,
            customDomain: false
          },
          {
            key: 'professional',
            name: 'Professional',
            price: 149,
            features: ['Everything in Starter', 'DIY Catering Builder', 'Loyalty Rewards Program', 'SMS Notifications (Twilio)', 'AI Chat Assistant', 'Customer Gallery', 'Full White-Label Branding', '3 Locations'],
            popular: true,
            color: '#f59e0b',
            whiteLabel: true,
            customDomain: false
          },
          {
            key: 'enterprise',
            name: 'Enterprise',
            price: 299,
            features: ['Everything in Professional', 'Custom Domain', 'Multi-Location Management', 'Priority Support', 'AI Social Content Generator', 'Advanced Analytics', 'Dedicated Account Manager', 'Unlimited Locations'],
            color: '#a855f7',
            whiteLabel: true,
            customDomain: true
          }
        ],
        displayOrder: 2
      },
      {
        slug: 'autohue',
        name: 'AutoHue',
        shortDescription: 'Stop wasting hours sorting car photos by hand. AutoHue uses AI to detect every vehicle, identify its colour, and sort thousands of photos into organised folders in minutes — right on your desktop.',
        fullDescription: 'AutoHue is a desktop app that uses advanced AI vision to automatically detect vehicles in photos, classify their colour with 95%+ accuracy, and sort them into 12 colour-coded folders instantly. Processes 5–10 images per second on your machine — no uploading, no cloud, no waiting. Drag in a folder of 5,000 photos and walk away. Perfect for car dealerships managing inventory photos, automotive photographers processing shoots, and auction houses cataloguing vehicles at scale. Download for Windows or Mac, paste your license key, and start sorting immediately.',
        icon: 'palette',
        category: 'automotive',
        routePath: '/autohue',
        demoUrl: 'https://autohue.app',
        features: ['AI Vehicle Detection', 'Intelligent Colour Classification', '12 Colour Categories', 'Batch Folder & ZIP Processing', '95%+ Accuracy', 'Runs Locally — Photos Stay Private', 'Quick Reassign Corrections', 'Watermark Editor (Pro)', 'Multi-Machine Licensing'],
        techStack: ['AI Vision Engine', 'Desktop App (Windows & Mac)', 'Colour Science', 'Scene Analysis'],
        plans: [
          {
            key: 'hobbyist',
            name: 'Hobbyist',
            price: 24,
            features: ['300 Images/Day', 'AI Vehicle Detection', '12 Colour Categories', 'ZIP Export', 'Quick Reassign', 'Email Support'],
            color: '#06b6d4',
            whiteLabel: false,
            customDomain: false
          },
          {
            key: 'pro',
            name: 'Pro',
            price: 99,
            features: ['2,000 Images/Day', 'Everything in Hobbyist', 'Watermark Editor', 'Priority AI Processing', 'Batch Folders & ZIPs'],
            popular: true,
            color: '#f59e0b',
            whiteLabel: false,
            customDomain: false
          },
          {
            key: 'unlimited',
            name: 'Unlimited',
            price: 249,
            features: ['10,000 Images/Day', 'Everything in Pro', 'Commercial Use License', 'Dedicated Support', 'Multi-Machine (2 PCs)'],
            color: '#a855f7',
            whiteLabel: false,
            customDomain: false
          }
        ],
        displayOrder: 3
      },
      {
        slug: 'simple-website',
        name: 'SimpleWebsite',
        shortDescription: 'White-label e-commerce website template with storefront, shopping cart, admin dashboard, and optional SocialAI add-on. Deploy a fully branded online store in minutes.',
        fullDescription: 'SimpleWebsite is a complete, production-ready e-commerce website template built with React 19, TypeScript, Firebase, and Vite. It includes a beautiful storefront with hero section, product grid, category browsing, and product detail pages. Customers can sign in with Google, add items to a cart, and checkout via Square payments. The admin dashboard provides full control over inventory, orders, customers, CMS content, inbox, and site-wide branding. Every element — colours, logos, images, text — is white-label configurable through the built-in CMS. The optional SocialAI Studio add-on (Professional plan and above) unlocks AI-powered social media content generation, image creation, smart scheduling, and engagement insights — all powered by Google Gemini 2.5.',
        icon: 'globe',
        category: 'ecommerce',
        routePath: '/simple-website',
        demoUrl: 'https://github.com/3dhuboz/SimpleWebsite',
        heroImage: '/app-previews/simplewebsite-preview.svg',
        setupFee: 199,
        features: [
          'Beautiful Storefront & Product Pages',
          'Shopping Cart & Square Checkout',
          'Customer Accounts (Google Sign-In)',
          'Admin Dashboard & Order Management',
          'Full CMS — Edit All Content & Branding',
          'Inventory & Category Management',
          'Contact Form & Admin Inbox',
          'GST/Tax Configuration',
          'Email Notifications',
          'PWA — Installable as Native App',
          'Responsive Mobile-First Design',
          'Full White-Label Branding'
        ],
        techStack: ['React 19', 'TypeScript', 'Firebase', 'Firestore', 'Firebase Auth', 'Square Payments', 'Vite', 'TailwindCSS'],
        plans: [
          {
            key: 'starter',
            name: 'Starter',
            price: 39,
            yearlyPrice: 390,
            features: ['Full E-Commerce Storefront', 'Shopping Cart & Checkout', 'Admin Dashboard', 'CMS Content Editor', 'Order Management', 'Customer Accounts', 'Email Notifications', '1 Store'],
            color: '#10b981',
            whiteLabel: false,
            customDomain: false
          },
          {
            key: 'professional',
            name: 'Professional',
            price: 79,
            yearlyPrice: 790,
            features: ['Everything in Starter', 'SocialAI Studio Add-On', 'AI Content Generation', 'AI Image Creation', 'Smart Post Scheduler', 'Engagement Insights', 'Full White-Label Branding', '3 Stores'],
            popular: true,
            color: '#f59e0b',
            whiteLabel: true,
            customDomain: false
          },
          {
            key: 'enterprise',
            name: 'Enterprise',
            price: 159,
            yearlyPrice: 1590,
            features: ['Everything in Professional', 'Custom Domain', 'Priority Support', 'API Access', 'Multi-Store Management', 'Dedicated Account Manager', 'SLA-Backed Uptime', 'Unlimited Stores'],
            color: '#a855f7',
            whiteLabel: true,
            customDomain: true
          }
        ],
        displayOrder: 5
      }
    ];

    for (const appData of apps) {
      await AppDefinition.findOneAndUpdate(
        { slug: appData.slug },
        appData,
        { upsert: true, new: true }
      );
    }

    res.json({ message: `${apps.length} app(s) seeded`, count: apps.length });
  } catch (err) {
    res.status(500).json({ message: 'Seed failed', error: err.message });
  }
});

// ══════════════════════════════════════════════
// ADMIN — Subscription Management
// ══════════════════════════════════════════════

// Get all subscriptions (with filters)
router.get('/admin/subscriptions', auth, adminOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.appId) query.app = req.query.appId;
    if (req.query.userId) query.user = req.query.userId;

    const subs = await AppSubscription.find(query)
      .populate('user', 'firstName lastName email company')
      .populate('app', 'name slug icon setupFee')
      .sort('-createdAt');
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin stats
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [totalApps, totalSubs, activeSubs, apps] = await Promise.all([
      AppDefinition.countDocuments({ isActive: true }),
      AppSubscription.countDocuments(),
      AppSubscription.countDocuments({ status: 'active' }),
      AppDefinition.find({ isActive: true }, 'name slug')
    ]);

    const revenue = await AppSubscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const subsByApp = await AppSubscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$app', count: { $sum: 1 }, revenue: { $sum: '$amount' } } }
    ]);

    // Populate app names for subsByApp
    const appMap = {};
    apps.forEach(a => { appMap[a._id.toString()] = a.name; });
    const subsByAppNamed = subsByApp.map(s => ({
      appName: appMap[s._id?.toString()] || 'Unknown',
      count: s.count,
      revenue: s.revenue
    }));

    res.json({
      totalApps,
      totalSubscriptions: totalSubs,
      activeSubscriptions: activeSubs,
      monthlyRevenue: revenue[0]?.total || 0,
      subsByApp: subsByAppNamed
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: activate subscription for a user
router.post('/admin/subscribe', auth, adminOnly, async (req, res) => {
  try {
    const { userId, appSlug, planKey } = req.body;
    const appDef = await AppDefinition.findOne({ slug: appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const plan = appDef.plans.find(p => p.key === planKey);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const now = new Date();
    const sub = await AppSubscription.findOneAndUpdate(
      { user: userId, app: appDef._id },
      {
        user: userId,
        app: appDef._id,
        planKey: plan.key,
        status: 'active',
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        lastPayment: now,
        amount: plan.price,
        currency: plan.currency || 'AUD'
      },
      { new: true, upsert: true }
    ).populate('app').populate('user', 'firstName lastName email');

    res.json({ message: `${plan.name} activated`, subscription: sub });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: cancel subscription
router.post('/admin/cancel', auth, adminOnly, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    const sub = await AppSubscription.findByIdAndUpdate(
      subscriptionId,
      { status: 'cancelled' },
      { new: true }
    ).populate('app').populate('user', 'firstName lastName email');

    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Subscription cancelled', subscription: sub });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: update app definition (plans, prices, descriptions, etc.)
router.put('/admin/apps/:appId', auth, adminOnly, async (req, res) => {
  try {
    const allowed = ['name', 'shortDescription', 'fullDescription', 'icon', 'category',
      'heroImage', 'features', 'techStack', 'routePath', 'setupFee', 'plans',
      'isActive', 'isPublished', 'displayOrder', 'demoUrl'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const app = await AppDefinition.findByIdAndUpdate(req.params.appId, { $set: update }, { new: true });
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json({ message: 'App updated', app });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: grant free license (for self-testing or comps)
router.post('/admin/grant-free', auth, adminOnly, async (req, res) => {
  try {
    const { userId, appSlug, planKey } = req.body;
    const targetUserId = userId || req.user._id; // default to self
    const appDef = await AppDefinition.findOne({ slug: appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const plan = appDef.plans.find(p => p.key === planKey);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const now = new Date();
    const sub = await AppSubscription.findOneAndUpdate(
      { user: targetUserId, app: appDef._id },
      {
        user: targetUserId,
        app: appDef._id,
        planKey: plan.key,
        status: 'active',
        startDate: now,
        endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
        lastPayment: now,
        amount: 0,
        currency: 'AUD'
      },
      { new: true, upsert: true }
    ).populate('app').populate('user', 'firstName lastName email');

    res.json({ message: `Free ${plan.name} license granted for ${appDef.name}`, subscription: sub });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ══════════════════════════════════════════════
// LICENSE VALIDATION — External license key check
// ══════════════════════════════════════════════

// Validate a SocialAI license key from the SimpleWebsite template
// Called by the deployed template instances to verify add-on access
router.post('/validate-license', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ valid: false, message: 'License key required' });

    // License key format: PWIT-SAI-<subscriptionId>
    const prefix = 'PWIT-SAI-';
    if (!licenseKey.startsWith(prefix)) {
      return res.json({ valid: false, message: 'Invalid license key format' });
    }

    const subId = licenseKey.slice(prefix.length);
    const sub = await AppSubscription.findById(subId).populate('app');
    if (!sub) return res.json({ valid: false, message: 'License not found' });

    // Must be a simple-website subscription on professional or enterprise plan
    if (sub.app?.slug !== 'simple-website') {
      return res.json({ valid: false, message: 'License not valid for this product' });
    }

    if (sub.status !== 'active' && sub.status !== 'trial') {
      return res.json({ valid: false, message: 'Subscription is not active' });
    }

    if (sub.planKey !== 'professional' && sub.planKey !== 'enterprise') {
      return res.json({ valid: false, message: 'SocialAI requires Professional or Enterprise plan' });
    }

    res.json({
      valid: true,
      plan: sub.planKey,
      message: 'License valid — SocialAI Studio activated'
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Validation error' });
  }
});

// ══════════════════════════════════════════════
// TENANT CONFIG — Per-customer app instance config
// ══════════════════════════════════════════════

// Get my tenant config for an app (e.g. Firebase creds for Wirez)
router.get('/tenant-config/:appSlug', auth, async (req, res) => {
  try {
    const appDef = await AppDefinition.findOne({ slug: req.params.appSlug });
    if (!appDef) return res.status(404).json({ message: 'App not found' });

    const sub = await AppSubscription.findOne({ user: req.user._id, app: appDef._id });
    if (!sub) return res.status(404).json({ message: 'No subscription found' });
    if (sub.status !== 'active' && sub.status !== 'trial') {
      return res.status(403).json({ message: 'Subscription not active' });
    }

    res.json({
      tenantConfig: sub.tenantConfig || {},
      whiteLabel: sub.whiteLabel || {},
      planKey: sub.planKey,
      status: sub.status
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: set tenant config for a user's subscription (provision Firebase project)
router.put('/admin/tenant-config/:subscriptionId', auth, adminOnly, async (req, res) => {
  try {
    const { tenantConfig, whiteLabel } = req.body;
    const update = {};
    if (tenantConfig) update.tenantConfig = tenantConfig;
    if (whiteLabel) update.whiteLabel = whiteLabel;

    const sub = await AppSubscription.findByIdAndUpdate(
      req.params.subscriptionId,
      { $set: update },
      { new: true }
    ).populate('app').populate('user', 'firstName lastName email');

    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Tenant config updated', subscription: sub });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
