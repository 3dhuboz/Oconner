const mongoose = require('mongoose');

const websiteSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  // Square payment config
  squareAccessToken: { type: String, default: '' },
  squareApplicationId: { type: String, default: '' },
  squareLocationId: { type: String, default: '' },
  squareEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },

  // Resend email config
  resendApiKey: { type: String, default: '' },
  resendFromEmail: { type: String, default: '' },
  resendFromName: { type: String, default: '' },

  // GST / Tax
  gstEnabled: { type: Boolean, default: true },
  gstRate: { type: Number, default: 10 },

  // Shipping
  freeShippingThreshold: { type: Number, default: 75 },
  defaultItemWeight: { type: Number, default: 500 }, // grams
  shippingTiers: [{
    maxWeight: { type: Number },
    standardPrice: { type: Number },
    expressPrice: { type: Number },
    label: { type: String }
  }],
  carrierName: { type: String, default: 'Australia Post' },
  trackingBaseUrl: { type: String, default: 'https://auspost.com.au/mypost/track/#/details/' },

  // Facebook / Social
  facebookAppId: { type: String, default: '' },
  facebookAppSecret: { type: String, default: '' },
  facebookPageId: { type: String, default: '' },
  facebookPageToken: { type: String, default: '' },

  // Branding assets
  brandLogo: { type: String, default: '' },
  favicon: { type: String, default: '' },
  founderImage: { type: String, default: '' },
  galleryImages: [{ type: String }],

  // AI
  openRouterApiKey: { type: String, default: '' },

  // Inventory
  lowStockThreshold: { type: Number, default: 5 }
}, { timestamps: true });

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
