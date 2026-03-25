const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  line1: { type: String, default: '' },
  line2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  postcode: { type: String, default: '' },
  country: { type: String, default: 'AU' },
  lat: Number,
  lng: Number
}, { _id: false });

const foodCustomerSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  phone: { type: String, default: '' },
  addresses: [addressSchema],
  orderCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  loyaltyStamps: { type: Number, default: 0 },
  blacklisted: { type: Boolean, default: false },
  blacklistReason: { type: String, default: '' },
  notes: { type: String, default: '' },
  tags: [String]
}, { timestamps: true });

foodCustomerSchema.index({ owner: 1, email: 1 });
foodCustomerSchema.index({ owner: 1, blacklisted: 1 });

module.exports = mongoose.model('FoodCustomer', foodCustomerSchema);
