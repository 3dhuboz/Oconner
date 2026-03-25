const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const FoodCustomer = require('../models/FoodCustomer');
const FoodOrder = require('../models/FoodOrder');

// GET all customers (optional ?q= search on name/email)
router.get('/', auth, async (req, res) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const customers = await FoodCustomer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single customer
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await FoodCustomer.findOne({ _id: req.params.id, owner: req.user._id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create customer
router.post('/', auth, async (req, res) => {
  try {
    const customer = new FoodCustomer({ ...req.body, owner: req.user._id });
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create customer', error: err.message });
  }
});

// PUT update customer
router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await FoodCustomer.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update customer', error: err.message });
  }
});

// PATCH toggle blacklist
router.patch('/:id/blacklist', auth, async (req, res) => {
  try {
    const customer = await FoodCustomer.findOne({ _id: req.params.id, owner: req.user._id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    customer.blacklisted = req.body.blacklisted;
    customer.blacklistReason = req.body.blacklistReason || '';
    await customer.save();
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET customer's orders (match on foodCustomer field OR customer.email)
router.get('/:id/orders', auth, async (req, res) => {
  try {
    const customer = await FoodCustomer.findOne({ _id: req.params.id, owner: req.user._id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const matchConditions = [{ foodCustomer: customer._id, owner: req.user._id }];
    if (customer.email) {
      matchConditions.push({ 'customer.email': customer.email, owner: req.user._id });
    }

    const orders = await FoodOrder.find({ $or: matchConditions })
      .sort({ createdAt: -1 })
      .populate('cookDay', 'date title');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
