const mongoose = require('mongoose');

const websiteOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    variant: { type: String, default: '' },
    image: { type: String, default: '' }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, default: 'square' },
  paymentId: { type: String, default: '' },
  shippingAddress: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postcode: { type: String, default: '' },
    country: { type: String, default: 'AU' }
  },
  notes: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
  gst: { type: Number, default: 0 },
  gstRate: { type: Number, default: 10 },
  isGuestCheckout: { type: Boolean, default: false },
  shippingMethod: { type: String, default: 'standard' },
  shippingWeight: { type: Number, default: 0 },
  customerAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

websiteOrderSchema.index({ userId: 1, status: 1 });
websiteOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WebsiteOrder', websiteOrderSchema);
