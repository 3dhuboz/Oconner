const mongoose = require('mongoose');

const foodOrderSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // business owner
  orderNumber: { type: String, unique: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: Number,
    options: [{ label: String, choice: String, priceAdjust: Number }],
    subtotal: Number,
    notes: String,
  }],
  orderType: { type: String, enum: ['pickup', 'delivery', 'catering'], default: 'pickup' },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'packed', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  fulfillmentType: { type: String, enum: ['pickup', 'delivery', 'market', 'subscription'], default: 'pickup' },
  cookDay: { type: mongoose.Schema.Types.ObjectId, ref: 'CookDay' },
  pickupDate: Date,
  pickupTime: String,
  deliveryAddress: String,
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  payment: {
    method: { type: String, enum: ['square', 'cash', 'other'], default: 'square' },
    status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    squarePaymentId: String,
    squareOrderId: String,
    squareCheckoutUrl: String,
    paidAt: Date,
  },
  notes: String,
  loyaltyStampsEarned: { type: Number, default: 0 },
  // Street Meatz additions
  deliveryFee: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  promoCode: { type: String, default: '' },
  promoDiscount: { type: Number, default: 0 },
  postcodeZone: { type: String, default: '' },
  internalNotes: { type: String, default: '' },
  proofUrl: { type: String, default: '' },
  packedAt: Date,
  packedBy: { type: String, default: '' },
  foodCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCustomer' },
}, { timestamps: true });

// Auto-generate order number
foodOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('FoodOrder').countDocuments({ owner: this.owner });
    this.orderNumber = `FT-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

foodOrderSchema.index({ owner: 1, status: 1 });
foodOrderSchema.index({ owner: 1, createdAt: -1 });
foodOrderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('FoodOrder', foodOrderSchema);
