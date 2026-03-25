const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryRun: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryRun', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCustomer' },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  sequence: { type: Number, default: 0 },
  address: {
    line1: String, line2: String, city: String, state: String,
    postcode: String, lat: Number, lng: Number
  },
  items: [{ name: String, quantity: Number, weight: Number }],
  status: { type: String, enum: ['pending', 'en_route', 'arrived', 'delivered', 'failed', 'skipped'], default: 'pending' },
  deliveredAt: Date,
  proofUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  driverNotes: { type: String, default: '' },
  flagReason: { type: String, enum: ['', 'nobody_home', 'wrong_address', 'damaged', 'refused', 'other'], default: '' }
}, { timestamps: true });

stopSchema.index({ owner: 1, deliveryRun: 1, sequence: 1 });

module.exports = mongoose.model('Stop', stopSchema);
