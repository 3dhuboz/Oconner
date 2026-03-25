const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  compareAtPrice: { type: Number, default: null },
  category: { type: String, default: 'General' },
  images: [{ type: String }],
  sku: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  trackInventory: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  weight: { type: Number, default: 0 },
  tags: [{ type: String }],
  variants: [{
    name: { type: String },
    options: [{ type: String }],
    priceAdjustment: { type: Number, default: 0 }
  }]
}, { timestamps: true });

productSchema.index({ userId: 1, category: 1 });
productSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
