const mongoose = require('mongoose');

const driverSessionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveryRun: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryRun' },
  driverName: { type: String, required: true },
  driverPhone: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  breadcrumbs: [{
    lat: Number, lng: Number, timestamp: { type: Date, default: Date.now }, speed: Number
  }],
  isActive: { type: Boolean, default: true },
  totalStops: { type: Number, default: 0 },
  completedStops: { type: Number, default: 0 }
}, { timestamps: true });

driverSessionSchema.index({ owner: 1, isActive: 1 });
driverSessionSchema.index({ owner: 1, deliveryRun: 1 });

module.exports = mongoose.model('DriverSession', driverSessionSchema);
