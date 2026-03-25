const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  available: { type: Boolean, default: true },
  preparationTime: { type: Number, default: 15 }, // minutes
  options: [{
    label: String,
    choices: [{
      name: String,
      priceAdjust: { type: Number, default: 0 }
    }]
  }],
  tags: [String], // e.g. 'vegan', 'gluten-free', 'spicy'
  sortOrder: { type: Number, default: 0 },
  isCatering: { type: Boolean, default: false },
  cateringMinQty: { type: Number, default: 10 },
  cateringPricePerHead: { type: Number, default: 0 },
}, { timestamps: true });

menuItemSchema.index({ owner: 1, category: 1 });
menuItemSchema.index({ owner: 1, available: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
