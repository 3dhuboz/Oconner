const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const DeliveryRun = require('../models/DeliveryRun');
const Stop = require('../models/Stop');
const DriverSession = require('../models/DriverSession');
const FoodOrder = require('../models/FoodOrder');
const CookDay = require('../models/CookDay');

// ═══════════════════════════════════════════
// DELIVERY RUNS
// ═══════════════════════════════════════════

// GET list runs (optional ?cookDay= or ?date= filter)
router.get('/runs', auth, async (req, res) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.cookDay) filter.cookDay = req.query.cookDay;
    if (req.query.date) filter.date = new Date(req.query.date);
    const runs = await DeliveryRun.find(filter)
      .sort({ date: -1 })
      .populate('cookDay', 'date title');
    res.json(runs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create run
router.post('/runs', auth, async (req, res) => {
  try {
    const run = new DeliveryRun({ ...req.body, owner: req.user._id });
    await run.save();
    res.status(201).json(run);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create delivery run', error: err.message });
  }
});

// PUT update run
router.put('/runs/:id', auth, async (req, res) => {
  try {
    const run = await DeliveryRun.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!run) return res.status(404).json({ message: 'Delivery run not found' });
    res.json(run);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update delivery run', error: err.message });
  }
});

// DELETE run (and its stops)
router.delete('/runs/:id', auth, async (req, res) => {
  try {
    const run = await DeliveryRun.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!run) return res.status(404).json({ message: 'Delivery run not found' });
    await Stop.deleteMany({ deliveryRun: run._id, owner: req.user._id });
    res.json({ message: 'Delivery run and stops deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST auto-assign orders to stops
router.post('/runs/:id/auto-assign', auth, async (req, res) => {
  try {
    const run = await DeliveryRun.findOne({ _id: req.params.id, owner: req.user._id });
    if (!run) return res.status(404).json({ message: 'Delivery run not found' });

    const orders = await FoodOrder.find({
      owner: req.user._id,
      cookDay: run.cookDay,
      fulfillmentType: 'delivery',
    }).populate('foodCustomer', 'name phone');

    const stops = [];
    let sequence = 1;
    for (const order of orders) {
      stops.push({
        owner: req.user._id,
        deliveryRun: run._id,
        order: order._id,
        customer: order.foodCustomer?._id || null,
        customerName: order.customer?.name || order.foodCustomer?.name || '',
        customerPhone: order.customer?.phone || order.foodCustomer?.phone || '',
        sequence: sequence++,
        address: { line1: order.deliveryAddress || '' },
        items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
      });
    }

    const created = await Stop.insertMany(stops);
    run.totalStops = created.length;
    await run.save();

    res.status(201).json({ stops: created, totalStops: created.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════
// STOPS
// ═══════════════════════════════════════════

// GET stops for a run (?runId= required)
router.get('/stops', auth, async (req, res) => {
  try {
    if (!req.query.runId) return res.status(400).json({ message: 'runId query param required' });
    const stops = await Stop.find({ owner: req.user._id, deliveryRun: req.query.runId })
      .sort({ sequence: 1 })
      .populate('order', 'orderNumber total status');
    res.json(stops);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update stop
router.put('/stops/:id', auth, async (req, res) => {
  try {
    const allowed = ['status', 'driverNotes', 'proofUrl', 'flagReason', 'sequence', 'deliveredAt'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.status === 'delivered' && !update.deliveredAt) update.deliveredAt = new Date();

    const stop = await Stop.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      update,
      { new: true }
    );
    if (!stop) return res.status(404).json({ message: 'Stop not found' });
    res.json(stop);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════
// DRIVER SESSIONS
// ═══════════════════════════════════════════

// POST start driver session
router.post('/driver-sessions', auth, async (req, res) => {
  try {
    const session = new DriverSession({
      owner: req.user._id,
      driverName: req.body.driverName,
      deliveryRun: req.body.deliveryRunId || null,
      driverPhone: req.body.driverPhone || '',
    });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ message: 'Failed to start driver session', error: err.message });
  }
});

// PUT ping breadcrumb
router.put('/driver-sessions/:id/ping', auth, async (req, res) => {
  try {
    const session = await DriverSession.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $push: { breadcrumbs: { lat: req.body.lat, lng: req.body.lng, timestamp: new Date() } } },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Driver session not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT end driver session
router.put('/driver-sessions/:id/end', auth, async (req, res) => {
  try {
    const session = await DriverSession.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isActive: false, endedAt: new Date() },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Driver session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET active driver sessions
router.get('/driver-sessions/active', auth, async (req, res) => {
  try {
    const sessions = await DriverSession.find({ owner: req.user._id, isActive: true })
      .populate('deliveryRun', 'name date status');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
