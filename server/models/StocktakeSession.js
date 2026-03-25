const mongoose = require('mongoose');

const stocktakeItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  menuItemName: String,
  expectedStock: { type: Number, default: 0 },
  countedStock: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { _id: false });

const stocktakeSessionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['in_progress', 'completed', 'cancelled'], default: 'in_progress' },
  items: [stocktakeItemSchema],
  totalVarianceQty: { type: Number, default: 0 },
  totalVarianceValue: { type: Number, default: 0 },
  completedAt: Date,
  completedBy: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

stocktakeSessionSchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('StocktakeSession', stocktakeSessionSchema);
