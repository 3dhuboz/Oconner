const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  maxUses: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  perCustomerLimit: { type: Number, default: 1 },
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  applicableItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }]
}, { timestamps: true });

promoCodeSchema.index({ owner: 1, code: 1 }, { unique: true });
promoCodeSchema.index({ owner: 1, isActive: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
