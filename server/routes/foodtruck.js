const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const MenuItem = require('../models/MenuItem');
const FoodOrder = require('../models/FoodOrder');
const CookDay = require('../models/CookDay');

// ═══════════════════════════════════════════
// MENU ITEMS
// ═══════════════════════════════════════════

// GET all menu items for the logged-in owner
router.get('/menu', auth, async (req, res) => {
  try {
    const items = await MenuItem.find({ owner: req.user._id }).sort({ category: 1, sortOrder: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load menu', error: err.message });
  }
});

// GET menu categories (distinct)
router.get('/menu/categories', auth, async (req, res) => {
  try {
    const cats = await MenuItem.distinct('category', { owner: req.user._id });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load categories', error: err.message });
  }
});

// POST create menu item
router.post('/menu', auth, async (req, res) => {
  try {
    const item = new MenuItem({ ...req.body, owner: req.user._id });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create item', error: err.message });
  }
});

// PUT update menu item
router.put('/menu/:id', auth, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update item', error: err.message });
  }
});

// DELETE menu item
router.delete('/menu/:id', auth, async (req, res) => {
  try {
    await MenuItem.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete item', error: err.message });
  }
});

// Toggle availability
router.patch('/menu/:id/toggle', auth, async (req, res) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.available = !item.available;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle', error: err.message });
  }
});

// ═══════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════

// GET orders for the logged-in owner
router.get('/orders', auth, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    const filter = { owner: req.user._id };
    if (status && status !== 'all') filter.status = status;
    const orders = await FoodOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate('cookDay', 'date title location');
    const total = await FoodOrder.countDocuments(filter);
    res.json({ orders, total });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load orders', error: err.message });
  }
});

// GET order stats
router.get('/orders/stats', auth, async (req, res) => {
  try {
    const ownerId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [pending, preparing, todayOrders, monthOrders, monthRevenue] = await Promise.all([
      FoodOrder.countDocuments({ owner: ownerId, status: 'pending' }),
      FoodOrder.countDocuments({ owner: ownerId, status: 'preparing' }),
      FoodOrder.countDocuments({ owner: ownerId, createdAt: { $gte: today } }),
      FoodOrder.countDocuments({ owner: ownerId, createdAt: { $gte: thisMonth } }),
      FoodOrder.aggregate([
        { $match: { owner: ownerId, createdAt: { $gte: thisMonth }, 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      pending,
      preparing,
      todayOrders,
      monthOrders,
      monthRevenue: monthRevenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load stats', error: err.message });
  }
});

// POST create order (can be from admin or public storefront later)
router.post('/orders', auth, async (req, res) => {
  try {
    const order = new FoodOrder({ ...req.body, owner: req.user._id });
    // Calculate totals
    let subtotal = 0;
    for (const item of order.items) {
      const optionsExtra = (item.options || []).reduce((sum, o) => sum + (o.priceAdjust || 0), 0);
      item.subtotal = (item.unitPrice + optionsExtra) * item.quantity;
      subtotal += item.subtotal;
    }
    order.subtotal = subtotal;
    order.tax = Math.round(subtotal * 0.1 * 100) / 100; // 10% GST
    order.total = Math.round((subtotal + order.tax) * 100) / 100;
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create order', error: err.message });
  }
});

// PUT update order status
router.put('/orders/:id/status', auth, async (req, res) => {
  try {
    const order = await FoodOrder.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update order', error: err.message });
  }
});

// PUT update payment status
router.put('/orders/:id/payment', auth, async (req, res) => {
  try {
    const update = { 'payment.status': req.body.status };
    if (req.body.status === 'paid') update['payment.paidAt'] = new Date();
    const order = await FoodOrder.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      update,
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update payment', error: err.message });
  }
});

// ═══════════════════════════════════════════
// COOK DAYS
// ═══════════════════════════════════════════

// GET cook days
router.get('/cookdays', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { owner: req.user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const days = await CookDay.find(filter).sort({ date: 1 });

    // Attach order counts
    const dayIds = days.map(d => d._id);
    const orderCounts = await FoodOrder.aggregate([
      { $match: { cookDay: { $in: dayIds } } },
      { $group: { _id: '$cookDay', count: { $sum: 1 }, revenue: { $sum: '$total' } } }
    ]);
    const countMap = {};
    orderCounts.forEach(o => { countMap[o._id.toString()] = { count: o.count, revenue: o.revenue }; });

    const result = days.map(d => ({
      ...d.toObject(),
      orderCount: countMap[d._id.toString()]?.count || 0,
      revenue: countMap[d._id.toString()]?.revenue || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load cook days', error: err.message });
  }
});

// POST create cook day
router.post('/cookdays', auth, async (req, res) => {
  try {
    const day = new CookDay({ ...req.body, owner: req.user._id });
    await day.save();
    res.status(201).json(day);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create cook day', error: err.message });
  }
});

// PUT update cook day
router.put('/cookdays/:id', auth, async (req, res) => {
  try {
    const day = await CookDay.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!day) return res.status(404).json({ message: 'Cook day not found' });
    res.json(day);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update cook day', error: err.message });
  }
});

// DELETE cook day
router.delete('/cookdays/:id', auth, async (req, res) => {
  try {
    await CookDay.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ message: 'Cook day deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete cook day', error: err.message });
  }
});

// ═══════════════════════════════════════════
// SEED SAMPLE DATA
// ═══════════════════════════════════════════

router.post('/seed', auth, async (req, res) => {
  try {
    const existing = await MenuItem.countDocuments({ owner: req.user._id });
    if (existing > 0) return res.json({ message: 'Menu already has items', seeded: false });

    const sampleItems = [
      // Mains
      { category: 'Mains', name: 'Classic Smoked Brisket', description: 'Low & slow smoked beef brisket, 14-hour cook. Served sliced with house BBQ sauce.', price: 18.00, image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400', available: true, preparationTime: 10, tags: ['popular', 'signature'], sortOrder: 1 },
      { category: 'Mains', name: 'Pulled Pork Roll', description: 'Hickory smoked pulled pork on a brioche bun with slaw and pickles.', price: 14.00, image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400', available: true, preparationTime: 8, tags: ['popular'], sortOrder: 2 },
      { category: 'Mains', name: 'Smoked Chicken Burger', description: 'Whole smoked chicken thigh, lettuce, tomato, and chipotle mayo on a toasted bun.', price: 15.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', available: true, preparationTime: 10, tags: [], sortOrder: 3 },
      { category: 'Mains', name: 'BBQ Ribs (Half Rack)', description: 'St. Louis style pork ribs glazed with smoky bourbon sauce.', price: 22.00, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', available: true, preparationTime: 12, tags: ['signature'], sortOrder: 4 },
      { category: 'Mains', name: 'Loaded Brisket Fries', description: 'Seasoned fries topped with chopped brisket, cheese sauce, jalapeños, and sour cream.', price: 16.00, image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400', available: true, preparationTime: 10, tags: ['popular'], sortOrder: 5 },

      // Sides
      { category: 'Sides', name: 'Classic Coleslaw', description: 'Creamy house-made coleslaw with a tangy vinegar kick.', price: 5.00, image: 'https://images.unsplash.com/photo-1625938145744-e380515399bf?w=400', available: true, preparationTime: 2, tags: ['vegan-option'], sortOrder: 1 },
      { category: 'Sides', name: 'Mac & Cheese', description: 'Creamy three-cheese mac baked until golden.', price: 7.00, image: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=400', available: true, preparationTime: 3, tags: ['vegetarian'], sortOrder: 2 },
      { category: 'Sides', name: 'Corn on the Cob', description: 'Grilled corn with butter and smoked paprika.', price: 4.50, image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400', available: true, preparationTime: 5, tags: ['vegan', 'gluten-free'], sortOrder: 3 },
      { category: 'Sides', name: 'Seasoned Chips', description: 'Thick-cut chips with our secret seasoning blend.', price: 6.00, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', available: true, preparationTime: 5, tags: ['vegan'], sortOrder: 4 },

      // Drinks
      { category: 'Drinks', name: 'House Lemonade', description: 'Fresh-squeezed lemonade with mint.', price: 5.00, image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400', available: true, preparationTime: 2, tags: ['vegan'], sortOrder: 1 },
      { category: 'Drinks', name: 'Iced Tea', description: 'Peach iced tea, brewed in-house.', price: 4.50, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', available: true, preparationTime: 1, tags: ['vegan'], sortOrder: 2 },
      { category: 'Drinks', name: 'Soft Drink (Can)', description: 'Coke, Sprite, or Fanta.', price: 3.50, image: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400', available: true, preparationTime: 1, tags: [], sortOrder: 3 },

      // Desserts
      { category: 'Desserts', name: 'Smoked Brownie', description: 'Rich chocolate brownie lightly smoked over cherry wood. Served warm.', price: 6.00, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400', available: true, preparationTime: 3, tags: ['vegetarian'], sortOrder: 1 },
      { category: 'Desserts', name: 'Churros (6pc)', description: 'Cinnamon sugar churros with chocolate dipping sauce.', price: 8.00, image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400', available: true, preparationTime: 5, tags: ['vegetarian'], sortOrder: 2 },

      // Catering
      { category: 'Catering', name: 'Brisket Platter (per head)', description: 'Sliced brisket, two sides, bread roll, sauce. Minimum 10 guests.', price: 25.00, image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400', available: true, preparationTime: 0, tags: [], sortOrder: 1, isCatering: true, cateringMinQty: 10, cateringPricePerHead: 25 },
      { category: 'Catering', name: 'Mixed BBQ Platter (per head)', description: 'Brisket, pulled pork, ribs, three sides, bread rolls, sauces. Minimum 15 guests.', price: 35.00, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', available: true, preparationTime: 0, tags: ['popular'], sortOrder: 2, isCatering: true, cateringMinQty: 15, cateringPricePerHead: 35 },
    ];

    const items = await MenuItem.insertMany(sampleItems.map(item => ({ ...item, owner: req.user._id })));
    console.log('[FoodTruck Seed]', items.length, 'sample menu items created for', req.user.email);
    res.json({ message: `${items.length} sample menu items created`, seeded: true, count: items.length });
  } catch (err) {
    console.error('[FoodTruck Seed] Error:', err);
    res.status(500).json({ message: 'Failed to seed data', error: err.message });
  }
});

// ═══════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════

router.get('/dashboard', auth, async (req, res) => {
  try {
    const [menuItems, totalOrders, pendingOrders, cookDays] = await Promise.all([
      MenuItem.countDocuments({ owner: req.user._id }),
      FoodOrder.countDocuments({ owner: req.user._id }),
      FoodOrder.countDocuments({ owner: req.user._id, status: 'pending' }),
      CookDay.countDocuments({ owner: req.user._id })
    ]);

    const revenueResult = await FoodOrder.aggregate([
      { $match: { owner: req.user._id, status: { $nin: ['cancelled', 'refunded'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const recentOrders = await FoodOrder.find({ owner: req.user._id })
      .sort({ createdAt: -1 }).limit(5)
      .select('orderNumber customerName total status createdAt');

    res.json({
      menuItems, totalOrders, pendingOrders, cookDays,
      revenue: revenueResult[0]?.total || 0,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard', error: err.message });
  }
});

module.exports = router;
