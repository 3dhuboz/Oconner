const mongoose = require('mongoose');

const socialProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: { type: String, default: 'My Business' },
  businessType: { type: String, default: 'small business' },
  description: { type: String, default: '' },
  tone: { type: String, default: 'Friendly and professional' },
  location: { type: String, default: 'Australia' },
  logoUrl: { type: String, default: '' },
  platforms: { type: [String], default: ['Instagram', 'Facebook'] },
  geminiApiKey: { type: String, default: '' },
  facebookAppId: { type: String, default: '' },
  facebookPageId: { type: String, default: '' },
  facebookPageAccessToken: { type: String, default: '' },
  facebookConnected: { type: Boolean, default: false },
  instagramBusinessAccountId: { type: String, default: '' },
  stats: {
    followers: { type: Number, default: 500 },
    reach: { type: Number, default: 2000 },
    engagement: { type: Number, default: 4.5 },
    postsLast30Days: { type: Number, default: 8 }
  },
  // ── Subscription ──
  subscription: {
    plan: { type: String, enum: ['none', 'starter', 'professional', 'enterprise'], default: 'none' },
    status: { type: String, enum: ['inactive', 'active', 'cancelled', 'expired', 'trial'], default: 'inactive' },
    startDate: { type: Date },
    endDate: { type: Date },
    trialEndsAt: { type: Date },
    paymentMethod: { type: String, default: '' },
    lastPayment: { type: Date },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'AUD' }
  },
  // ── White Label Branding ──
  whiteLabel: {
    brandName: { type: String, default: '' },
    tagline: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#f59e0b' },
    accentColor: { type: String, default: '#1e1b4b' },
    headerBg: { type: String, default: '#0f172a' },
    buttonColor: { type: String, default: '#f59e0b' },
    fontFamily: { type: String, default: '' },
    customDomain: { type: String, default: '' },
    hideByline: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Virtual: is subscription active
socialProfileSchema.virtual('isSubscribed').get(function () {
  if (!this.subscription) return false;
  const s = this.subscription;
  if (s.status === 'active') return true;
  if (s.status === 'trial' && s.trialEndsAt && new Date(s.trialEndsAt) > new Date()) return true;
  return false;
});

socialProfileSchema.set('toJSON', { virtuals: true });
socialProfileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SocialProfile', socialProfileSchema);
