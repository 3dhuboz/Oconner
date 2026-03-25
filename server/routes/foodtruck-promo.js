const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PromoCode = require('../models/PromoCode');

// GET all promo codes
router.get('/', auth, async (req, res) => {
  try {
    const codes = await PromoCode.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create promo code (validate uniqueness per owner)
router.post('/', auth, async (req, res) => {
  try {
    const existing = await PromoCode.findOne({
      owner: req.user._id,
      code: req.body.code.toUpperCase().trim(),
    });
    if (existing) return res.status(409).json({ message: 'Promo code already exists' });

    const promo = new PromoCode({ ...req.body, owner: req.user._id });
    await promo.save();
    res.status(201).json(promo);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create promo code', error: err.message });
  }
});

// PUT update promo code
router.put('/:id', auth, async (req, res) => {
  try {
    const promo = await PromoCode.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!promo) return res.status(404).json({ message: 'Promo code not found' });
    res.json(promo);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update promo code', error: err.message });
  }
});

// DELETE promo code
router.delete('/:id', auth, async (req, res) => {
  try {
    await PromoCode.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ message: 'Promo code deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST validate a promo code
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const promo = await PromoCode.findOne({
      owner: req.user._id,
      code: code.toUpperCase().trim(),
    });

    if (!promo) return res.json({ valid: false, reason: 'Code not found' });
    if (!promo.isActive) return res.json({ valid: false, reason: 'Code is inactive' });
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return res.json({ valid: false, reason: 'Code has expired' });
    }
    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      return res.json({ valid: false, reason: 'Code usage limit reached' });
    }
    if (promo.minOrder > 0 && subtotal < promo.minOrder) {
      return res.json({ valid: false, reason: `Minimum order of $${promo.minOrder} required` });
    }

    let discount = 0;
    if (promo.type === 'percentage') {
      discount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
    } else {
      discount = promo.value;
    }

    res.json({ valid: true, discount, type: promo.type, value: promo.value });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
