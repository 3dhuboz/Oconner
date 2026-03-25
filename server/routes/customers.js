const express = require('express');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { auth, staffOrAdmin, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all customers (staff/admin)
router.get('/', auth, staffOrAdmin, async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort('-createdAt');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single customer with stats (staff/admin)
router.get('/:id', auth, staffOrAdmin, async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const ticketStats = await Ticket.aggregate([
      { $match: { customer: customer._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({ customer, ticketStats });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update customer (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { firstName, lastName, email, company, phone, isActive, hostingPlan, sitegroundSiteId, notes } = req.body;
    const customer = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, company, phone, isActive, hostingPlan, sitegroundSiteId, notes },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create customer (admin - for adding existing clients)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { firstName, lastName, email, password, company, phone, hostingPlan, sitegroundSiteId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const customer = new User({
      firstName, lastName, email,
      password: password || 'TempPass123!',
      company, phone, hostingPlan, sitegroundSiteId,
      role: 'customer'
    });
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
