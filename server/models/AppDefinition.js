const mongoose = require('mongoose');

const appDefinitionSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  shortDescription: { type: String, required: true },
  fullDescription: { type: String, default: '' },
  icon: { type: String, default: 'sparkles' },
  category: { type: String, enum: ['ai', 'automation', 'analytics', 'productivity', 'marketing', 'food-service', 'automotive', 'trades', 'ecommerce', 'utility', 'other'], default: 'other' },
  heroImage: { type: String, default: '' },
  features: [{ type: String }],
  techStack: [{ type: String }],
  demoUrl: { type: String, default: '' },
  routePath: { type: String, default: '' },
  setupFee: { type: Number, default: 0 },
  plans: [{
    key: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    yearlyPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'AUD' },
    interval: { type: String, enum: ['monthly', 'yearly', 'one-time'], default: 'monthly' },
    features: [{ type: String }],
    popular: { type: Boolean, default: false },
    color: { type: String, default: '#3b82f6' },
    whiteLabel: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false }
  }],
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AppDefinition', appDefinitionSchema);
