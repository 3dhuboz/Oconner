const express = require('express');
const Product = require('../models/Product');
const WebsiteOrder = require('../models/WebsiteOrder');
const WebsitePage = require('../models/WebsitePage');
const ContactMessage = require('../models/ContactMessage');
const { auth, adminOnly } = require('../middleware/auth');

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

module.exports = router;
