const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Supplier = require('../models/Supplier');

// GET all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ owner: req.user._id }).sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create supplier
router.post('/', auth, async (req, res) => {
  try {
    const supplier = new Supplier({ ...req.body, owner: req.user._id });
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create supplier', error: err.message });
  }
});

// PUT update supplier (verify owner)
router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update supplier', error: err.message });
  }
});

// DELETE supplier (verify owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
