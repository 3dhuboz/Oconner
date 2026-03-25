const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  contactName: { type: String, default: '' },
  email: { type: String, default: '', trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  abn: { type: String, default: '' },
  paymentTerms: { type: String, default: '' },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

supplierSchema.index({ owner: 1, isActive: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
