const mongoose = require('mongoose');

const cookDaySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  title: { type: String, default: '' },
  location: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    lat: Number,
    lng: Number,
  },
  timeStart: { type: String, default: '10:00' },
  timeEnd: { type: String, default: '20:00' },
  maxOrders: { type: Number, default: 0 }, // 0 = unlimited
  ordersCutoffHours: { type: Number, default: 24 }, // hours before cook day orders close
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  notes: { type: String, default: '' },
  isRecurring: { type: Boolean, default: false },
  recurringDay: { type: Number, min: 0, max: 6 }, // 0=Sun, 6=Sat
  // Street Meatz additions
  dayOfWeek: { type: Number, min: 0, max: 6 },
  frozen: { type: Boolean, default: false },
  deliveryWindowStart: { type: String, default: '' },
  deliveryWindowEnd: { type: String, default: '' },
  driverName: { type: String, default: '' },
  zones: [String],
  type: { type: String, enum: ['delivery', 'pickup', 'market'], default: 'pickup' },
  marketLocation: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    lat: Number,
    lng: Number
  },
  routeGenerated: { type: Boolean, default: false },
  routeGeneratedAt: Date,
  orderCount: { type: Number, default: 0 },
}, { timestamps: true });

cookDaySchema.index({ owner: 1, date: 1 });
cookDaySchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('CookDay', cookDaySchema);
