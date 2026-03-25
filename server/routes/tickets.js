const express = require('express');
const Ticket = require('../models/Ticket');
const { auth, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get tickets (customers see their own, staff/admin see all)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    }

    const { status, priority, category } = req.query;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const tickets = await Ticket.find(query)
      .populate('customer', 'firstName lastName email company')
      .populate('assignedTo', 'firstName lastName')
      .sort('-createdAt');

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single ticket
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customer', 'firstName lastName email company')
      .populate('assignedTo', 'firstName lastName')
      .populate('comments.user', 'firstName lastName role');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role === 'customer' && ticket.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create ticket
router.post('/', auth, async (req, res) => {
  try {
    const ticket = new Ticket({
      ...req.body,
      customer: req.user._id
    });
    await ticket.save();
    await ticket.populate('customer', 'firstName lastName email company');
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update ticket (staff/admin)
router.put('/:id', auth, staffOrAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.status === 'resolved') updateData.resolvedAt = new Date();
    if (req.body.status === 'closed') updateData.closedAt = new Date();

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('customer', 'firstName lastName email company')
      .populate('assignedTo', 'firstName lastName');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add comment to ticket
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role === 'customer' && ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    ticket.comments.push({
      user: req.user._id,
      message: req.body.message,
      isInternal: req.body.isInternal && req.user.role !== 'customer'
    });

    await ticket.save();
    await ticket.populate('comments.user', 'firstName lastName role');
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
