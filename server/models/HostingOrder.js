const mongoose = require('mongoose');

const hostingOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planKey: { type: String, required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  currency: { type: String, default: 'AUD' },
  status: { type: String, enum: ['pending', 'provisioning', 'active', 'suspended', 'cancelled'], default: 'pending' },

  // Customer-provided details for hosting setup
  domainName: { type: String, required: true, trim: true },
  domainAction: { type: String, enum: ['register-new', 'transfer-existing', 'point-dns'], default: 'register-new' },
  businessName: { type: String, trim: true },
  contactName: { type: String, trim: true },
  contactEmail: { type: String, required: true, trim: true },
  contactPhone: { type: String, trim: true },
  currentHost: { type: String, trim: true },
  websiteType: { type: String, enum: ['wordpress', 'static', 'ecommerce', 'custom', 'other'], default: 'wordpress' },
  additionalNotes: { type: String, default: '' },

  // Admin tracking
  sitegroundSiteId: { type: String, default: '' },
  squareInvoiceId: { type: String, default: '' },
  adminNotes: { type: String, default: '' },
  provisionedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('HostingOrder', hostingOrderSchema);
