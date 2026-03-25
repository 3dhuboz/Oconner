const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const FoodCustomer = require('../models/FoodCustomer');
const FoodOrder = require('../models/FoodOrder');
const MenuItem = require('../models/MenuItem');

// GET all subscriptions (populate customer)
router.get('/', auth, async (req, res) => {
  try {
    const subs = await Subscription.find({ owner: req.user._id })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create subscription
router.post('/', auth, async (req, res) => {
  try {
    const sub = new Subscription({ ...req.body, owner: req.user._id });
    await sub.save();
    res.status(201).json(sub);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create subscription', error: err.message });
  }
});

// PUT update subscription
router.put('/:id', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update subscription', error: err.message });
  }
});

// PATCH toggle pause/active
router.patch('/:id/pause', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, owner: req.user._id });
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    sub.status = sub.status === 'active' ? 'paused' : 'active';
    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE cancel subscription (set status to cancelled)
router.delete('/:id', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: 'cancelled' },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST generate order from subscription
router.post('/:id/generate-order', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, owner: req.user._id })
      .populate('customer', 'name email phone');
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    const items = sub.useAlternate && sub.alternateBox.length ? sub.alternateBox : sub.items;

    let subtotal = 0;
    const orderItems = items.map(item => {
      const lineTotal = item.unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        menuItem: item.menuItem,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: lineTotal,
      };
    });

    const tax = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const order = new FoodOrder({
      owner: req.user._id,
      customer: {
        name: sub.customer.name,
        email: sub.customer.email || '',
        phone: sub.customer.phone || '',
      },
      foodCustomer: sub.customer._id,
      items: orderItems,
      fulfillmentType: 'subscription',
      orderType: 'delivery',
      deliveryAddress: sub.deliveryAddress
        ? `${sub.deliveryAddress.line1 || ''} ${sub.deliveryAddress.city || ''} ${sub.deliveryAddress.postcode || ''}`.trim()
        : '',
      subtotal,
      tax,
      total,
      notes: sub.notes || '',
    });

    await order.save();

    sub.lastOrderGeneratedAt = new Date();
    await sub.save();

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
