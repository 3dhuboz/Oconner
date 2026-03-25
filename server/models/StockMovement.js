const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  type: { type: String, enum: ['sale', 'adjustment', 'wastage', 'restock', 'return', 'stocktake_correction'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, default: 0 },
  newStock: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  reference: { type: String, default: '' },
  performedBy: { type: String, default: '' }
}, { timestamps: true });

stockMovementSchema.index({ owner: 1, menuItem: 1 });
stockMovementSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
