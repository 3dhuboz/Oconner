const mongoose = require('mongoose');

const clientProjectSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectName: { type: String, required: true, trim: true },
  businessName: { type: String, trim: true },
  contactName: { type: String, trim: true },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },

  // Which apps are included in this project
  apps: [{
    slug: { type: String, required: true },
    name: { type: String },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'AppSubscription' },
    planKey: { type: String }
  }],

  // Deployment tracking
  deployment: {
    provider: { type: String, enum: ['render', 'vercel', 'netlify', 'other'], default: 'render' },
    serviceId: { type: String, default: '' },
    serviceName: { type: String, default: '' },
    serviceUrl: { type: String, default: '' },
    customDomain: { type: String, default: '' },
    branch: { type: String, default: 'main' },
    repoUrl: { type: String, default: '' },
    lastDeployed: { type: Date },
    deployStatus: { type: String, enum: ['not_started', 'deploying', 'live', 'failed', 'suspended'], default: 'not_started' }
  },

  // Environment variable tracking (names only, not secrets)
  envVars: [{
    key: { type: String },
    description: { type: String },
    isSet: { type: Boolean, default: false }
  }],

  // White-label branding config
  whiteLabel: {
    brandName: { type: String, default: '' },
    tagline: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#3b82f6' },
    accentColor: { type: String, default: '#1e1b4b' },
    fontFamily: { type: String, default: '' }
  },

  // Setup checklist — tracks onboarding progress
  setupChecklist: [{
    step: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    notes: { type: String, default: '' }
  }],

  // Local development
  localProjectPath: { type: String, default: '' },
  scaffoldPending: { type: Boolean, default: false },
  scaffoldRequestedAt: { type: Date },

  // Per-client MongoDB database (created automatically on first write)
  dbName: { type: String, default: '' },

  // General
  notes: { type: String, default: '' },
  status: { type: String, enum: ['setup', 'active', 'suspended', 'cancelled'], default: 'setup' },
  monthlyRevenue: { type: Number, default: 0 },
  currency: { type: String, default: 'AUD' }
}, { timestamps: true });

clientProjectSchema.index({ client: 1 });
clientProjectSchema.index({ status: 1 });

module.exports = mongoose.model('ClientProject', clientProjectSchema);
