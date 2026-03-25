const mongoose = require('mongoose');

const deliveryRunSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cookDay: { type: mongoose.Schema.Types.ObjectId, ref: 'CookDay', required: true },
  date: { type: Date, required: true },
  name: { type: String, default: '' },
  driverName: { type: String, default: '' },
  driverPhone: { type: String, default: '' },
  zones: [String],
  color: { type: String, default: '#3b82f6' },
  status: { type: String, enum: ['planned', 'in_progress', 'completed'], default: 'planned' },
  totalStops: { type: Number, default: 0 },
  completedStops: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  notes: { type: String, default: '' }
}, { timestamps: true });

deliveryRunSchema.index({ owner: 1, date: 1 });
deliveryRunSchema.index({ owner: 1, cookDay: 1 });

module.exports = mongoose.model('DeliveryRun', deliveryRunSchema);
