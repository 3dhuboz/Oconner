const express = require('express');
const Portfolio = require('../models/Portfolio');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all published portfolio items (public)
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = { isPublished: true };
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;

    const items = await Portfolio.find(query).sort('displayOrder');
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single portfolio item (public)
router.get('/:id', async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Portfolio item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create portfolio item (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const item = new Portfolio(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update portfolio item (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const item = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Portfolio item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete portfolio item (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ message: 'Portfolio item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
