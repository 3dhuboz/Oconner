const mongoose = require('mongoose');

const subItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: String,
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCustomer', required: true },
  frequency: { type: String, enum: ['weekly', 'fortnightly', 'monthly'], default: 'weekly' },
  dayOfWeek: { type: Number, min: 0, max: 6, default: 5 },
  items: [subItemSchema],
  alternateBox: [subItemSchema],
  useAlternate: { type: Boolean, default: false },
  deliveryAddress: {
    line1: String, line2: String, city: String, state: String,
    postcode: String, lat: Number, lng: Number
  },
  postcodeZone: { type: String, default: '' },
  status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
  nextDelivery: Date,
  startDate: Date,
  lastOrderGeneratedAt: Date,
  notes: { type: String, default: '' }
}, { timestamps: true });

subscriptionSchema.index({ owner: 1, status: 1 });
subscriptionSchema.index({ owner: 1, customer: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
