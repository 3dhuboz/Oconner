const express = require('express');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Workflow = require('../models/Workflow');
const Service = require('../models/Service');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats (admin)
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      openTickets,
      inProgressTickets,
      activeWorkflows,
      totalServices
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', isActive: true }),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in-progress' }),
      Workflow.countDocuments({ status: 'active' }),
      Service.countDocuments({ isActive: true })
    ]);

    const recentTickets = await Ticket.find()
      .populate('customer', 'firstName lastName company')
      .sort('-createdAt')
      .limit(5);

    const ticketsByCategory = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const ticketsByPriority = await Ticket.aggregate([
      { $match: { status: { $in: ['open', 'in-progress'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalCustomers,
        activeCustomers,
        openTickets,
        inProgressTickets,
        activeWorkflows,
        totalServices
      },
      recentTickets,
      ticketsByCategory,
      ticketsByPriority
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Seed initial data (admin - run once)
router.post('/seed', auth, adminOnly, async (req, res) => {
  try {
    const serviceCount = await Service.countDocuments();
    if (serviceCount > 0) {
      return res.json({ message: 'Data already seeded' });
    }

    const services = [
      {
        title: 'Web Hosting',
        shortDescription: 'Reliable, fast web hosting powered by SiteGround GoGeek infrastructure.',
        fullDescription: 'Enterprise-grade web hosting with SSD storage, free SSL, daily backups, and 99.9% uptime guarantee. Managed by our expert team so you can focus on your business.',
        icon: 'server',
        category: 'web-hosting',
        features: ['SSD Storage', 'Free SSL Certificate', 'Daily Backups', '99.9% Uptime', 'Email Hosting', '24/7 Monitoring'],
        pricing: { type: 'monthly', amount: 29.99, currency: 'AUD' },
        displayOrder: 1
      },
      {
        title: 'Custom App Development',
        shortDescription: 'Bespoke applications built from the ground up to solve your unique business challenges.',
        fullDescription: 'From concept to deployment, we build custom web and mobile applications tailored to your exact specifications. Using modern technologies like React, Node.js, and cloud infrastructure.',
        icon: 'code',
        category: 'app-development',
        features: ['Custom Web Apps', 'Mobile Apps', 'API Development', 'Database Design', 'Cloud Deployment', 'Ongoing Support'],
        pricing: { type: 'custom', currency: 'AUD' },
        displayOrder: 2
      },
      {
        title: 'Workflow Solutions',
        shortDescription: 'Streamline your business processes with custom workflow automation.',
        fullDescription: 'We analyse your business processes and build custom workflow solutions that automate repetitive tasks, improve efficiency, and reduce human error. Integrated with your existing tools and databases.',
        icon: 'workflow',
        category: 'workflow-solutions',
        features: ['Process Automation', 'Custom Dashboards', 'Database Solutions', 'Integration Services', 'Reporting & Analytics', 'Staff Training'],
        pricing: { type: 'custom', currency: 'AUD' },
        displayOrder: 3
      },
      {
        title: 'Website Maintenance',
        shortDescription: 'Keep your website secure, updated, and performing at its best.',
        fullDescription: 'Regular updates, security patches, performance optimisation, and content management. We handle the technical side so your website stays healthy and your visitors stay happy.',
        icon: 'shield',
        category: 'maintenance',
        features: ['Security Updates', 'Performance Monitoring', 'Content Updates', 'SEO Optimisation', 'Monthly Reports', 'Priority Support'],
        pricing: { type: 'monthly', amount: 99, currency: 'AUD' },
        displayOrder: 4
      },
      {
        title: 'IT Consulting',
        shortDescription: 'Expert guidance on technology strategy, architecture, and digital transformation.',
        fullDescription: 'Whether you are starting fresh or modernising legacy systems, our consulting services help you make informed technology decisions. We provide roadmaps, architecture reviews, and implementation guidance.',
        icon: 'lightbulb',
        category: 'consulting',
        features: ['Technology Audits', 'Architecture Planning', 'Digital Strategy', 'Vendor Selection', 'Migration Planning', 'Training & Mentoring'],
        pricing: { type: 'hourly', amount: 150, currency: 'AUD' },
        displayOrder: 5
      },
      {
        title: 'SocialAI Studio',
        shortDescription: 'Research-driven AI social media manager that analyses your real engagement data to build smarter strategies.',
        fullDescription: 'SocialAI Studio uses Google Gemini 2.5 AI to analyse your real Facebook and Instagram engagement data — top-performing posts, best days, winning hashtags — then builds data-driven content schedules that replicate what works. Features include insights-to-schedule workflow, AI image generation, evolving best practices hub, and full white-label branding.',
        icon: 'sparkles',
        category: 'social-ai',
        features: [
          'Research-Driven AI Engine (Google Gemini 2.5)',
          'AI Analyses Your Real Post Performance',
          'Data-Backed Smart 2-Week Scheduler',
          'Insights-to-Schedule Workflow',
          'AI Marketing Image Generation',
          'Evolving Best Practices Knowledge Hub',
          'Performance Intelligence & Best Times',
          'Full White-Label Branding'
        ],
        pricing: { type: 'monthly', amount: 49, currency: 'AUD' },
        displayOrder: 6
      },
      {
        title: 'AutoHue',
        shortDescription: 'Free AI-powered car photo colour sorter. Upload vehicle photos and auto-sort by colour.',
        fullDescription: 'AutoHue uses YOLOv8 AI to detect cars in your photos, identify their dominant colour using K-means clustering, and automatically sort them into 11 colour-coded folders. Perfect for car dealerships, automotive photographers, and auction houses. Completely free to use — no account required.',
        icon: 'palette',
        category: 'free-tool',
        features: [
          'Bulk Photo Upload',
          'YOLOv8 AI Car Detection',
          'Automatic Colour Classification',
          'Sort into 11 Colour Categories',
          'ZIP Export of Sorted Photos',
          'Real-Time Processing Progress',
          '100% Free — No Account Needed',
          'Open Source (MIT License)'
        ],
        pricing: { type: 'fixed', amount: 0, currency: 'AUD' },
        displayOrder: 7
      }
    ];

    await Service.insertMany(services);
    res.json({ message: 'Initial services seeded successfully', count: services.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Initialize admin user
router.post('/init', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.json({ message: 'Admin already exists' });
    }

    const admin = new User({
      firstName: 'Admin',
      lastName: 'PennyWise',
      email: process.env.ADMIN_EMAIL || 'admin@pennywiseit.com.au',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      company: 'Penny Wise I.T',
      isActive: true
    });
    await admin.save();
    res.status(201).json({ message: 'Admin user created', email: admin.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
