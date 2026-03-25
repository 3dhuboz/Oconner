const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  shortDescription: { type: String, required: true },
  fullDescription: { type: String },
  icon: { type: String, default: 'globe' },
  category: {
    type: String,
    enum: ['web-hosting', 'app-development', 'workflow-solutions', 'maintenance', 'consulting', 'social-ai', 'free-tool'],
    required: true
  },
  features: [{ type: String }],
  pricing: {
    type: { type: String, enum: ['fixed', 'hourly', 'monthly', 'custom'], default: 'custom' },
    amount: { type: Number },
    currency: { type: String, default: 'AUD' }
  },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  image: { type: String }
}, { timestamps: true });

serviceSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);
