const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const StockMovement = require('../models/StockMovement');
const MenuItem = require('../models/MenuItem');
const StocktakeSession = require('../models/StocktakeSession');

// GET stock movements (optional ?menuItem= filter)
router.get('/movements', auth, async (req, res) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.menuItem) filter.menuItem = req.query.menuItem;
    const movements = await StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('menuItem', 'name category');
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST manual stock adjustment
router.post('/adjust', auth, async (req, res) => {
  try {
    const { menuItemId, quantity, type, reason } = req.body;
    const item = await MenuItem.findOne({ _id: menuItemId, owner: req.user._id });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    const previousStock = item.stockOnHand || 0;
    const newStock = previousStock + quantity;

    const movement = new StockMovement({
      owner: req.user._id,
      menuItem: menuItemId,
      type,
      quantity,
      previousStock,
      newStock,
      reason: reason || '',
    });
    await movement.save();

    item.stockOnHand = newStock;
    await item.save();

    res.status(201).json({ movement, stockOnHand: newStock });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET low stock items
router.get('/low-stock', auth, async (req, res) => {
  try {
    const items = await MenuItem.find({
      owner: req.user._id,
      stockOnHand: { $ne: null },
      $expr: { $lte: ['$stockOnHand', '$minThreshold'] },
    }).sort({ stockOnHand: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create stocktake session
router.post('/stocktake', auth, async (req, res) => {
  try {
    const session = new StocktakeSession({ ...req.body, owner: req.user._id });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create stocktake', error: err.message });
  }
});

// GET list stocktake sessions
router.get('/stocktake', auth, async (req, res) => {
  try {
    const sessions = await StocktakeSession.find({ owner: req.user._id })
      .sort({ date: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update stocktake session (add items, complete)
router.put('/stocktake/:id', auth, async (req, res) => {
  try {
    const session = await StocktakeSession.findOne({ _id: req.params.id, owner: req.user._id });
    if (!session) return res.status(404).json({ message: 'Stocktake session not found' });

    // Update fields from body
    if (req.body.items) session.items = req.body.items;
    if (req.body.notes !== undefined) session.notes = req.body.notes;

    // If completing the session, process variances
    if (req.body.status === 'completed' && session.status !== 'completed') {
      session.status = 'completed';
      session.completedAt = new Date();
      session.completedBy = req.body.completedBy || '';

      let totalVarianceQty = 0;
      let totalVarianceValue = 0;

      for (const item of session.items) {
        const variance = item.countedStock - item.expectedStock;
        item.variance = variance;
        totalVarianceQty += Math.abs(variance);

        if (variance !== 0) {
          const menuItem = await MenuItem.findOne({ _id: item.menuItem, owner: req.user._id });
          if (menuItem) {
            const previousStock = menuItem.stockOnHand || 0;
            totalVarianceValue += Math.abs(variance) * (menuItem.price || 0);

            await StockMovement.create({
              owner: req.user._id,
              menuItem: item.menuItem,
              type: 'stocktake_correction',
              quantity: variance,
              previousStock,
              newStock: item.countedStock,
              reason: `Stocktake correction: expected ${item.expectedStock}, counted ${item.countedStock}`,
            });

            menuItem.stockOnHand = item.countedStock;
            await menuItem.save();
          }
        }
      }

      session.totalVarianceQty = totalVarianceQty;
      session.totalVarianceValue = totalVarianceValue;
    } else if (req.body.status) {
      session.status = req.body.status;
    }

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
