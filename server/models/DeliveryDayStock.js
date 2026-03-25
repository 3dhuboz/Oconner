const mongoose = require('mongoose');

const deliveryDayStockSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cookDay: { type: mongoose.Schema.Types.ObjectId, ref: 'CookDay', required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  menuItemName: { type: String, default: '' },
  allocated: { type: Number, default: 0 },
  sold: { type: Number, default: 0 }
}, { timestamps: true });

deliveryDayStockSchema.index({ owner: 1, cookDay: 1, menuItem: 1 }, { unique: true });

deliveryDayStockSchema.virtual('remaining').get(function () {
  return this.allocated - this.sold;
});

deliveryDayStockSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('DeliveryDayStock', deliveryDayStockSchema);
