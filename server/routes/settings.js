const express = require('express');
const SiteSettings = require('../models/SiteSettings');
const { auth, adminOnly } = require('../middleware/auth');
const { invalidateSquareCache, getSquareClient, getLocationId } = require('../utils/square');

const router = express.Router();

// Get site settings (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update site settings (admin only)
router.put('/', auth, adminOnly, async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    const allowed = [
      'businessName', 'businessEmail', 'businessPhone', 'businessFacebook',
      'businessInstagram', 'businessLinkedin', 'businessWebsite', 'businessABN',
      'brandName', 'brandTagline', 'brandLogoUrl', 'brandPrimaryColor', 'brandAccentColor', 'brandHeroImage',
      'squareAccessToken', 'squareLocationId', 'squareEnvironment', 'squareWebhookSecret',
      'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFromName', 'smtpFromEmail', 'smtpSecure',
      'sitegroundApiUrl', 'sitegroundApiToken',
      'hostingPlans', 'domainSalesEnabled', 'domainMarkup', 'domainNotes'
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    }
    await settings.save();

    // Invalidate Square cache if any Square settings were changed
    if (req.body.squareAccessToken !== undefined || req.body.squareLocationId !== undefined || req.body.squareEnvironment !== undefined) {
      invalidateSquareCache();
    }

    res.json({ message: 'Settings updated', settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get public hosting plans (no auth needed — for storefront)
router.get('/hosting-plans', async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    const plans = (settings.hostingPlans || []).filter(p => p.isActive);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get public business contact info (for footer, contact page)
router.get('/public', async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.json({
      businessName: settings.businessName,
      businessEmail: settings.businessEmail,
      businessPhone: settings.businessPhone,
      businessFacebook: settings.businessFacebook,
      businessInstagram: settings.businessInstagram,
      businessLinkedin: settings.businessLinkedin,
      businessWebsite: settings.businessWebsite,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Test Square connection (admin only)
router.post('/test-square', auth, adminOnly, async (req, res) => {
  try {
    const client = await getSquareClient();
    if (!client) {
      return res.status(400).json({ success: false, message: 'No Square Access Token configured. Save your credentials first.' });
    }

    const locationId = await getLocationId();

    // Try listing locations to verify the token works
    const locationsRes = await client.locationsApi.listLocations();
    const locations = locationsRes.result.locations || [];
    const matchedLocation = locationId ? locations.find(l => l.id === locationId) : null;

    res.json({
      success: true,
      message: `Connected to Square! Found ${locations.length} location(s).`,
      locations: locations.map(l => ({ id: l.id, name: l.name, status: l.status })),
      locationMatch: matchedLocation ? `Location "${matchedLocation.name}" verified` : (locationId ? 'Warning: Location ID not found in your account' : 'No Location ID configured yet')
    });
  } catch (err) {
    const errorMsg = err.result?.errors?.[0]?.detail || err.message || 'Unknown error';
    res.status(400).json({ success: false, message: `Square connection failed: ${errorMsg}` });
  }
});

module.exports = router;
