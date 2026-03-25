const mongoose = require('mongoose');

const appSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  app: { type: mongoose.Schema.Types.ObjectId, ref: 'AppDefinition', required: true },
  planKey: { type: String, required: true },
  status: { type: String, enum: ['active', 'cancelled', 'expired', 'trial', 'inactive'], default: 'inactive' },
  startDate: { type: Date },
  endDate: { type: Date },
  trialEndsAt: { type: Date },
  lastPayment: { type: Date },
  billingInterval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  amount: { type: Number, default: 0 },
  setupFeePaid: { type: Boolean, default: false },
  setupFeeAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'AUD' },
  squareInvoiceId: { type: String, default: '' },
  // Tenant-specific config (e.g. Firebase credentials for Wirez instances)
  tenantConfig: {
    apiKey: { type: String, default: '' },
    authDomain: { type: String, default: '' },
    projectId: { type: String, default: '' },
    storageBucket: { type: String, default: '' },
    messagingSenderId: { type: String, default: '' },
    appId: { type: String, default: '' },
  },
  // White-label branding (per user per app)
  whiteLabel: {
    brandName: { type: String, default: '' },
    tagline: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#3b82f6' },
    accentColor: { type: String, default: '#1e1b4b' },
    headerBg: { type: String, default: '#0f172a' },
    buttonColor: { type: String, default: '#3b82f6' },
    fontFamily: { type: String, default: '' },
    customDomain: { type: String, default: '' },
    hideByline: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Compound unique: one subscription per user per app
appSubscriptionSchema.index({ user: 1, app: 1 }, { unique: true });

// Virtual: is subscription active
appSubscriptionSchema.virtual('isActive').get(function () {
  if (this.status === 'active') return true;
  if (this.status === 'trial' && this.trialEndsAt && new Date(this.trialEndsAt) > new Date()) return true;
  return false;
});

appSubscriptionSchema.set('toJSON', { virtuals: true });
appSubscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AppSubscription', appSubscriptionSchema);
