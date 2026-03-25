const express = require('express');
const axios = require('axios');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// SiteGround API helper
const sgApi = axios.create({
  baseURL: process.env.SITEGROUND_API_URL || 'https://api.siteground.com',
  headers: { 'Authorization': `Bearer ${process.env.SITEGROUND_API_TOKEN}` }
});

// Get SiteGround account overview (admin)
router.get('/account', auth, adminOnly, async (req, res) => {
  try {
    // SiteGround Site Tools API integration
    // Note: SiteGround uses Site Tools API - you'll need to configure OAuth tokens
    // For now, this provides a structure for when the API is configured
    if (!process.env.SITEGROUND_API_TOKEN) {
      return res.json({
        message: 'SiteGround API not configured yet',
        setup: {
          step1: 'Log into SiteGround Site Tools',
          step2: 'Navigate to Dev > API',
          step3: 'Generate an API token',
          step4: 'Add the token to your .env file as SITEGROUND_API_TOKEN'
        }
      });
    }

    const response = await sgApi.get('/v1/account');
    res.json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json({ message: 'SiteGround API error', error: err.response.data });
    }
    res.status(500).json({ message: 'Failed to connect to SiteGround', error: err.message });
  }
});

// List sites on GoGeek account (admin)
router.get('/sites', auth, adminOnly, async (req, res) => {
  try {
    if (!process.env.SITEGROUND_API_TOKEN) {
      return res.json({
        configured: false,
        message: 'SiteGround API token not configured',
        sites: []
      });
    }

    const response = await sgApi.get('/v1/sites');
    res.json({ configured: true, sites: response.data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sites', error: err.message });
  }
});

// Get site details (admin)
router.get('/sites/:siteId', auth, adminOnly, async (req, res) => {
  try {
    const response = await sgApi.get(`/v1/sites/${req.params.siteId}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch site details', error: err.message });
  }
});

// Get site statistics (admin)
router.get('/sites/:siteId/stats', auth, adminOnly, async (req, res) => {
  try {
    const response = await sgApi.get(`/v1/sites/${req.params.siteId}/statistics`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch site stats', error: err.message });
  }
});

// Manage site cache (admin)
router.post('/sites/:siteId/cache/purge', auth, adminOnly, async (req, res) => {
  try {
    const response = await sgApi.post(`/v1/sites/${req.params.siteId}/cache/purge`);
    res.json({ message: 'Cache purged successfully', data: response.data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to purge cache', error: err.message });
  }
});

// Get site backups (admin)
router.get('/sites/:siteId/backups', auth, adminOnly, async (req, res) => {
  try {
    const response = await sgApi.get(`/v1/sites/${req.params.siteId}/backups`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch backups', error: err.message });
  }
});

// Trigger site backup (admin)
router.post('/sites/:siteId/backups', auth, adminOnly, async (req, res) => {
  try {
    const response = await sgApi.post(`/v1/sites/${req.params.siteId}/backups`);
    res.json({ message: 'Backup initiated', data: response.data });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create backup', error: err.message });
  }
});

// Get SSL status (admin)
router.get('/sites/:siteId/ssl', auth, adminOnly, async (req, res) => {
  try {
    const response = await sgApi.get(`/v1/sites/${req.params.siteId}/ssl`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch SSL status', error: err.message });
  }
});

module.exports = router;
