const express = require('express');
const Product = require('../models/Product');
const WebsiteOrder = require('../models/WebsiteOrder');
const WebsitePage = require('../models/WebsitePage');
const ContactMessage = require('../models/ContactMessage');
const Category = require('../models/Category');
const WebsiteSettings = require('../models/WebsiteSettings');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');
const { sendEmail, sendOrderConfirmation, sendShippingNotification } = require('../services/resend');
const { generateText, generateImage } = require('../services/openrouter');

const router = express.Router();

// ═══════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════

// GET all products for current user
router.get('/products', auth, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
});

// POST create product
router.post('/products', auth, async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, userId: req.user._id });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create product', error: err.message });
  }
});

// PUT update product
router.put('/products/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update product', error: err.message });
  }
});

// DELETE product
router.delete('/products/:id', auth, async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err.message });
  }
});

// GET product stats/summary
router.get('/products/stats', auth, async (req, res) => {
  try {
    const total = await Product.countDocuments({ userId: req.user._id });
    const active = await Product.countDocuments({ userId: req.user._id, isActive: true });
    const lowStock = await Product.countDocuments({ userId: req.user._id, trackInventory: true, stock: { $lte: 5 }, isActive: true });
    const categories = await Product.distinct('category', { userId: req.user._id });
    res.json({ total, active, lowStock, categories: categories.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════

// GET all orders
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await WebsiteOrder.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
});

// POST create order
router.post('/orders', auth, async (req, res) => {
  try {
    const count = await WebsiteOrder.countDocuments({ userId: req.user._id });
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;
    const order = await WebsiteOrder.create({ ...req.body, userId: req.user._id, orderNumber });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
});

// PUT update order status
router.put('/orders/:id', auth, async (req, res) => {
  try {
    const order = await WebsiteOrder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order', error: err.message });
  }
});

// GET order stats
router.get('/orders/stats', auth, async (req, res) => {
  try {
    const total = await WebsiteOrder.countDocuments({ userId: req.user._id });
    const pending = await WebsiteOrder.countDocuments({ userId: req.user._id, status: 'pending' });
    const processing = await WebsiteOrder.countDocuments({ userId: req.user._id, status: { $in: ['confirmed', 'processing'] } });
    const completed = await WebsiteOrder.countDocuments({ userId: req.user._id, status: { $in: ['shipped', 'delivered'] } });

    // Revenue
    const revenueResult = await WebsiteOrder.aggregate([
      { $match: { userId: req.user._id, status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenue = revenueResult[0]?.total || 0;

    res.json({ total, pending, processing, completed, revenue });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  CMS PAGES
// ═══════════════════════════════════════════════

// GET all pages
router.get('/pages', auth, async (req, res) => {
  try {
    const pages = await WebsitePage.find({ userId: req.user._id }).sort({ slug: 1 });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pages', error: err.message });
  }
});

// POST create page
router.post('/pages', auth, async (req, res) => {
  try {
    const page = await WebsitePage.create({ ...req.body, userId: req.user._id });
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create page', error: err.message });
  }
});

// PUT update page
router.put('/pages/:id', auth, async (req, res) => {
  try {
    const page = await WebsitePage.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update page', error: err.message });
  }
});

// DELETE page
router.delete('/pages/:id', auth, async (req, res) => {
  try {
    await WebsitePage.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Page deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete page', error: err.message });
  }
});

// Seed default pages
router.post('/pages/seed', auth, async (req, res) => {
  try {
    const existing = await WebsitePage.countDocuments({ userId: req.user._id });
    if (existing > 0) return res.json({ message: 'Pages already exist' });

    const defaults = [
      { slug: 'home', title: 'Home', heroTitle: 'Welcome to Our Store', heroSubtitle: 'Discover our amazing products', content: 'Welcome to our online store.' },
      { slug: 'about', title: 'About Us', heroTitle: 'About Us', content: 'Tell your customers about your business story, values, and team.' },
      { slug: 'contact', title: 'Contact', heroTitle: 'Get in Touch', content: 'We\'d love to hear from you. Send us a message below.' },
      { slug: 'faq', title: 'FAQ', heroTitle: 'Frequently Asked Questions', content: 'Common questions answered.' },
      { slug: 'shipping', title: 'Shipping & Returns', heroTitle: 'Shipping & Returns', content: 'Our shipping and return policies.' }
    ];

    const pages = await WebsitePage.insertMany(defaults.map(p => ({ ...p, userId: req.user._id })));
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to seed pages', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  CONTACT MESSAGES (Inbox)
// ═══════════════════════════════════════════════

// GET all messages
router.get('/messages', auth, async (req, res) => {
  try {
    const messages = await ContactMessage.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

// POST create message (public-facing contact form)
router.post('/messages', auth, async (req, res) => {
  try {
    const message = await ContactMessage.create({ ...req.body, userId: req.user._id });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// PUT mark read / reply
router.put('/messages/:id', auth, async (req, res) => {
  try {
    const message = await ContactMessage.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update message', error: err.message });
  }
});

// DELETE message
router.delete('/messages/:id', auth, async (req, res) => {
  try {
    await ContactMessage.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
});

// GET unread count
router.get('/messages/unread-count', auth, async (req, res) => {
  try {
    const count = await ContactMessage.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to count', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════

router.get('/dashboard', auth, async (req, res) => {
  try {
    const [products, orders, messages, pages] = await Promise.all([
      Product.countDocuments({ userId: req.user._id }),
      WebsiteOrder.countDocuments({ userId: req.user._id }),
      ContactMessage.countDocuments({ userId: req.user._id, isRead: false }),
      WebsitePage.countDocuments({ userId: req.user._id })
    ]);

    const revenueResult = await WebsiteOrder.aggregate([
      { $match: { userId: req.user._id, status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const pendingOrders = await WebsiteOrder.countDocuments({ userId: req.user._id, status: 'pending' });
    const lowStock = await Product.countDocuments({ userId: req.user._id, trackInventory: true, stock: { $lte: 5 }, isActive: true });

    const recentOrders = await WebsiteOrder.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(5)
      .select('orderNumber customerName total status createdAt');

    res.json({
      products, orders, unreadMessages: messages, pages,
      revenue: revenueResult[0]?.total || 0,
      pendingOrders, lowStock, recentOrders
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════

// GET all categories for current user
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories', error: err.message });
  }
});

// POST create category
router.post('/categories', auth, async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, userId: req.user._id });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create category', error: err.message });
  }
});

// PUT update category
router.put('/categories/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update category', error: err.message });
  }
});

// DELETE category
router.delete('/categories/:id', auth, async (req, res) => {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete category', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  WEBSITE SETTINGS
// ═══════════════════════════════════════════════

// GET settings (create default if not exists)
router.get('/settings', auth, async (req, res) => {
  try {
    let settings = await WebsiteSettings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await WebsiteSettings.create({ userId: req.user._id });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch settings', error: err.message });
  }
});

// PUT update settings
router.put('/settings', auth, async (req, res) => {
  try {
    const settings = await WebsiteSettings.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  PUBLIC / GUEST ROUTES
// ═══════════════════════════════════════════════

// POST public order (guest checkout)
router.post('/public/orders', optionalAuth, async (req, res) => {
  try {
    const { userId, items, customerName, customerEmail, customerPhone, shippingAddress, paymentId, paymentMethod, shippingMethod, notes } = req.body;

    if (!userId) return res.status(400).json({ message: 'userId is required' });

    // Load settings for shipping + GST calculation
    const settings = await WebsiteSettings.findOne({ userId }) || {};
    const tiers = settings.shippingTiers || [];
    const gstEnabled = settings.gstEnabled !== false;
    const gstRate = settings.gstRate || 10;
    const freeShippingThreshold = settings.freeShippingThreshold || 75;
    const defaultItemWeight = settings.defaultItemWeight || 500;

    // Calculate subtotal
    const subtotal = (items || []).reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

    // Calculate total weight
    const shippingWeight = (items || []).reduce((sum, item) => sum + (defaultItemWeight * (item.quantity || 1)), 0);

    // Calculate shipping from tiers
    let shipping = 0;
    const method = shippingMethod || 'standard';
    if (subtotal < freeShippingThreshold && tiers.length > 0) {
      const tier = tiers.find(t => shippingWeight <= t.maxWeight) || tiers[tiers.length - 1];
      shipping = method === 'express' ? (tier.expressPrice || 0) : (tier.standardPrice || 0);
    }

    // Calculate GST
    const gst = gstEnabled ? Math.round((subtotal + shipping) * (gstRate / 100) * 100) / 100 : 0;

    // Total
    const total = subtotal + shipping + gst;

    // Generate order number
    const count = await WebsiteOrder.countDocuments({ userId });
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

    const order = await WebsiteOrder.create({
      userId,
      orderNumber,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      items: items || [],
      subtotal,
      tax: gst,
      gst,
      gstRate: gstEnabled ? gstRate : 0,
      shipping,
      shippingMethod: method,
      shippingWeight,
      total,
      shippingAddress: shippingAddress || {},
      paymentId: paymentId || '',
      paymentMethod: paymentMethod || 'square',
      notes: notes || '',
      isGuestCheckout: !req.user,
      customerAccount: req.user?._id || null
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
});

// POST public contact form
router.post('/public/contact', async (req, res) => {
  try {
    const { userId, name, email, phone, subject, message } = req.body;

    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (!name || !email || !message) return res.status(400).json({ message: 'Name, email, and message are required' });

    const contactMessage = await ContactMessage.create({
      userId,
      name,
      email,
      phone: phone || '',
      subject: subject || 'Contact Form',
      message
    });

    res.status(201).json(contactMessage);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  AI ROUTES
// ═══════════════════════════════════════════════

// POST generate product description
router.post('/ai/product-description', auth, async (req, res) => {
  try {
    const settings = await WebsiteSettings.findOne({ userId: req.user._id });
    if (!settings?.openRouterApiKey) {
      return res.status(400).json({ message: 'OpenRouter API key not configured. Update your settings first.' });
    }

    const { name, category } = req.body;
    if (!name) return res.status(400).json({ message: 'Product name is required' });

    const prompt = `Write a compelling, SEO-friendly product description for an e-commerce store. The product is called "${name}"${category ? ` in the "${category}" category` : ''}. Write 2-3 short paragraphs that highlight key features and benefits. Keep it professional and persuasive. Return only the description text, no headings or labels.`;

    const description = await generateText(settings.openRouterApiKey, prompt);
    res.json({ description: description.trim() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate description', error: err.message });
  }
});

// POST generate product image
router.post('/ai/product-image', auth, async (req, res) => {
  try {
    const settings = await WebsiteSettings.findOne({ userId: req.user._id });
    if (!settings?.openRouterApiKey) {
      return res.status(400).json({ message: 'OpenRouter API key not configured. Update your settings first.' });
    }

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Product name is required' });

    const prompt = `Create a professional product photograph for an e-commerce store. The product is: "${name}". ${description ? `Description: ${description}` : ''} The image should have a clean white background, professional studio lighting, and be suitable for an online store product listing.`;

    const imageUrl = await generateImage(settings.openRouterApiKey, prompt);
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate image', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  EMAIL ROUTES
// ═══════════════════════════════════════════════

// POST send order confirmation email
router.post('/email/order-confirmation', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await WebsiteOrder.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const settings = await WebsiteSettings.findOne({ userId: req.user._id });
    if (!settings?.resendApiKey || !settings?.resendFromEmail) {
      return res.status(400).json({ message: 'Resend email not configured. Update your settings first.' });
    }

    const result = await sendOrderConfirmation(settings, order);
    res.json({ message: 'Order confirmation sent', result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send order confirmation', error: err.message });
  }
});

// POST send shipping notification email
router.post('/email/shipping-notification', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'orderId is required' });

    const order = await WebsiteOrder.findOne({ _id: orderId, userId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const settings = await WebsiteSettings.findOne({ userId: req.user._id });
    if (!settings?.resendApiKey || !settings?.resendFromEmail) {
      return res.status(400).json({ message: 'Resend email not configured. Update your settings first.' });
    }

    const result = await sendShippingNotification(settings, order);
    res.json({ message: 'Shipping notification sent', result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send shipping notification', error: err.message });
  }
});

// POST send test email
router.post('/email/test', auth, async (req, res) => {
  try {
    const settings = await WebsiteSettings.findOne({ userId: req.user._id });
    if (!settings?.resendApiKey || !settings?.resendFromEmail) {
      return res.status(400).json({ message: 'Resend email not configured. Update your settings first.' });
    }

    const from = settings.resendFromName
      ? `${settings.resendFromName} <${settings.resendFromEmail}>`
      : settings.resendFromEmail;

    const result = await sendEmail(settings.resendApiKey, {
      from,
      to: req.user.email,
      subject: 'Test Email - SimpleWebsite',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#7c3aed;">Test Email</h2>
          <p>This is a test email from your SimpleWebsite store.</p>
          <p>If you received this, your Resend email integration is working correctly.</p>
          <p style="color:#6b7280;font-size:12px;">Sent at ${new Date().toISOString()}</p>
        </div>
      `
    });

    res.json({ message: 'Test email sent', result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

// ═══════════════════════════════════════════════
//  SHIPPING CALCULATION
// ═══════════════════════════════════════════════

// POST calculate shipping rates
router.post('/shipping/calculate', optionalAuth, async (req, res) => {
  try {
    const { weight, postcode, userId: bodyUserId } = req.body;
    const userId = req.user?._id || bodyUserId;

    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const settings = await WebsiteSettings.findOne({ userId });
    if (!settings) return res.status(404).json({ message: 'Store settings not found' });

    const tiers = settings.shippingTiers || [];
    const freeShippingThreshold = settings.freeShippingThreshold || 75;
    const shippingWeight = weight || settings.defaultItemWeight || 500;

    // Find matching tier
    const tier = tiers.find(t => shippingWeight <= t.maxWeight) || tiers[tiers.length - 1];

    const standard = tier ? (tier.standardPrice || 0) : 0;
    const express = tier ? (tier.expressPrice || 0) : 0;

    res.json({
      standard,
      express,
      freeShippingThreshold,
      freeShipping: false, // caller checks subtotal against threshold
      carrier: settings.carrierName,
      tierLabel: tier?.label || ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate shipping', error: err.message });
  }
});

module.exports = router;
