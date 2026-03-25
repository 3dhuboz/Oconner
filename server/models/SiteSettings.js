const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  // Singleton key — only one document
  _singleton: { type: String, default: 'site-settings', unique: true },

  // Business Contact Info
  businessName: { type: String, default: 'Penny Wise I.T' },
  businessEmail: { type: String, default: 'admin@pennywiseit.com.au' },
  businessPhone: { type: String, default: '' },
  businessFacebook: { type: String, default: '' },
  businessInstagram: { type: String, default: '' },
  businessLinkedin: { type: String, default: '' },
  businessWebsite: { type: String, default: '' },
  businessABN: { type: String, default: '' },

  // Payment Gateway — Square
  squareAccessToken: { type: String, default: '' },
  squareLocationId: { type: String, default: '' },
  squareEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
  squareWebhookSecret: { type: String, default: '' },

  // Email Server — SMTP
  smtpHost: { type: String, default: '' },
  smtpPort: { type: Number, default: 587 },
  smtpUser: { type: String, default: '' },
  smtpPass: { type: String, default: '' },
  smtpFromName: { type: String, default: 'Penny Wise I.T' },
  smtpFromEmail: { type: String, default: '' },
  smtpSecure: { type: Boolean, default: false },

  // SiteGround / GoGeek
  sitegroundApiUrl: { type: String, default: 'https://api.siteground.com' },
  sitegroundApiToken: { type: String, default: '' },

  // Hosting Plans (sold to customers)
  hostingPlans: [{
    key: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    yearlyPrice: { type: Number, default: 0 },
    storage: { type: String, default: '' },
    bandwidth: { type: String, default: '' },
    emails: { type: String, default: '' },
    domains: { type: String, default: '' },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#3b82f6' }
  }],

  // Branding (client self-service)
  brandName: { type: String, default: '' },
  brandTagline: { type: String, default: '' },
  brandLogoUrl: { type: String, default: '' },
  brandPrimaryColor: { type: String, default: '#7c3aed' },
  brandAccentColor: { type: String, default: '#f59e0b' },
  brandHeroImage: { type: String, default: '' },

  // Domain Sales
  domainSalesEnabled: { type: Boolean, default: true },
  domainMarkup: { type: Number, default: 0 },
  domainNotes: { type: String, default: '' },

}, { timestamps: true });

// Static method to get or create the singleton
siteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ _singleton: 'site-settings' });
  if (!settings) {
    settings = await this.create({
      businessPhone: '0480259884',
      businessFacebook: 'https://www.facebook.com/pennywiseitoz',
      hostingPlans: [
        {
          key: 'starter',
          name: 'Starter Hosting',
          price: 19.99,
          yearlyPrice: 199,
          storage: '10 GB SSD',
          bandwidth: 'Unmetered',
          emails: '5 Email Accounts',
          domains: '1 Domain',
          features: ['Free SSL', 'Daily Backups', 'cPanel Access', 'WordPress Ready', 'Email Support'],
          isActive: true,
          color: '#10b981'
        },
        {
          key: 'business',
          name: 'Business Hosting',
          price: 39.99,
          yearlyPrice: 399,
          storage: '30 GB SSD',
          bandwidth: 'Unmetered',
          emails: '25 Email Accounts',
          domains: '5 Domains',
          features: ['Everything in Starter', 'Staging Environment', 'Priority Support', 'Advanced Caching', 'Free Domain Transfer', 'Malware Scan'],
          isActive: true,
          color: '#f59e0b'
        },
        {
          key: 'premium',
          name: 'Premium Hosting',
          price: 69.99,
          yearlyPrice: 699,
          storage: '100 GB SSD',
          bandwidth: 'Unmetered',
          emails: 'Unlimited Email Accounts',
          domains: 'Unlimited Domains',
          features: ['Everything in Business', 'Dedicated Resources', 'White-Label DNS', 'Phone Support', 'SLA-Backed Uptime', 'Custom Server Config', 'Priority Migration'],
          isActive: true,
          color: '#a855f7'
        }
      ]
    });
  }
  return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
