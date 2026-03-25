const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  slug: { type: String, required: true, trim: true, lowercase: true },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

categorySchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
