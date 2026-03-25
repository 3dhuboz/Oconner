const express = require('express');
const fetch = require('node-fetch');
const SocialPost = require('../models/SocialPost');
const SocialProfile = require('../models/SocialProfile');
const { auth, staffOrAdmin, adminOnly } = require('../middleware/auth');
const {
  generateSocialPost,
  generateMarketingImage,
  analyzePostTimes,
  generateRecommendations,
  generateSmartSchedule
} = require('../services/gemini');
const { generateVideoFromImage, getTaskStatus, cancelTask } = require('../services/runway');

const router = express.Router();

// ── Profile ──

// Get current user's social profile
router.get('/profile', auth, async (req, res) => {
  try {
    let profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await SocialProfile.create({ user: req.user._id });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update social profile
router.put('/profile', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      { ...req.body, user: req.user._id },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Posts CRUD ──

// Get posts (customers see own, admin sees all or filtered by userId)
router.get('/posts', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.user = req.user._id;
    } else if (req.query.userId) {
      query.user = req.query.userId;
    }
    if (req.query.status) query.status = req.query.status;
    if (req.query.platform) query.platform = req.query.platform;

    const posts = await SocialPost.find(query)
      .populate('user', 'firstName lastName email company')
      .sort('-scheduledFor');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create post
router.post('/posts', auth, async (req, res) => {
  try {
    const post = new SocialPost({ ...req.body, user: req.user._id });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Bulk create posts (for smart schedule)
router.post('/posts/bulk', auth, async (req, res) => {
  try {
    const posts = (req.body.posts || []).map(p => ({ ...p, user: req.user._id }));
    const created = await SocialPost.insertMany(posts);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update post
router.put('/posts/:id', auth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (req.user.role === 'customer' && post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(post, req.body);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete post
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (req.user.role === 'customer' && post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete all posts for current user
router.delete('/posts', auth, async (req, res) => {
  try {
    const query = req.user.role === 'customer' ? { user: req.user._id } : {};
    await SocialPost.deleteMany(query);
    res.json({ message: 'All posts cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── AI Generation ──

// Admin-controlled Gemini API key fallback — customers don't need their own
const ADMIN_GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const getGeminiKey = (profile) => profile?.geminiApiKey || ADMIN_GEMINI_KEY;

// Check AI availability — admin key or user key
router.get('/ai/status', auth, async (req, res) => {
  const profile = await SocialProfile.findOne({ user: req.user._id });
  const hasAdminKey = !!ADMIN_GEMINI_KEY;
  const hasUserKey = !!profile?.geminiApiKey;
  res.json({
    aiAvailable: hasAdminKey || hasUserKey,
    adminManaged: hasAdminKey,
    userKeySet: hasUserKey
  });
});

// Generate text post — context-aware with past performance data
router.post('/ai/generate', auth, async (req, res) => {
  try {
    const { topic, platform } = req.body;
    const profile = await SocialProfile.findOne({ user: req.user._id });
    const geminiKey = getGeminiKey(profile);
    if (!geminiKey) {
      return res.status(400).json({ message: 'AI not configured. Contact admin or add your Gemini API key in Settings.' });
    }

    // Gather top-performing posts for context
    let topPostExamples = [];
    if (profile.facebookConnected && profile.facebookPageAccessToken) {
      try {
        const token = profile.facebookPageAccessToken;
        const source = platform === 'Instagram' && profile.instagramBusinessAccountId
          ? `${profile.instagramBusinessAccountId}/media?fields=caption,like_count,comments_count`
          : `${profile.facebookPageId}/posts?fields=message,likes.limit(0).summary(true),comments.limit(0).summary(true),shares`;
        const fbRes = await fetch(`${FB_GRAPH}/${source}&limit=10&access_token=${token}`);
        const fbData = await fbRes.json();
        if (fbData.data) {
          topPostExamples = fbData.data
            .map(p => ({
              text: (p.message || p.caption || '').substring(0, 150),
              engagement: (p.likes?.summary?.total_count || p.like_count || 0) +
                (p.comments?.summary?.total_count || p.comments_count || 0) * 3 +
                (p.shares?.count || 0) * 5
            }))
            .filter(p => p.text.length > 20)
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 3);
        }
      } catch (e) { /* research is optional */ }
    }

    const result = await generateSocialPost(
      geminiKey, topic, platform,
      profile.businessName, profile.businessType, profile.tone,
      topPostExamples
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'AI generation failed', error: err.message });
  }
});

// Generate image
router.post('/ai/image', auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const profile = await SocialProfile.findOne({ user: req.user._id });
    const geminiKey = getGeminiKey(profile);
    if (!geminiKey) {
      return res.status(400).json({ message: 'AI not configured. Contact admin or add your Gemini API key in Settings.' });
    }
    const image = await generateMarketingImage(geminiKey, `${(profile?.businessType || 'business')}: ${prompt}`);
    if (image) {
      res.json({ image });
    } else {
      res.status(500).json({ message: 'Image generation failed. Try again.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Image generation failed', error: err.message });
  }
});

// Smart schedule — research-driven AI engine (25s timeout to stay under Render's 30s limit)
router.post('/ai/smart-schedule', auth, async (req, res) => {
  let timer;
  try {
    const { count } = req.body;
    const profile = await SocialProfile.findOne({ user: req.user._id });
    const geminiKey = getGeminiKey(profile);
    if (!geminiKey) {
      return res.status(400).json({ message: 'AI not configured. Contact admin or add your Gemini API key in Settings.' });
    }
    const stats = {
      followers: profile.stats?.followers ?? 0,
      reach: profile.stats?.reach ?? 0,
      engagement: profile.stats?.engagement ?? 0,
      postsLast30Days: profile.stats?.postsLast30Days ?? 0
    };

    // 25s timeout for the entire operation (research + AI)
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Smart schedule timed out — the AI took too long. Please try again.')), 25000);
    });

    const work = async () => {
      // ── RESEARCH PHASE: Gather real data in PARALLEL ──
      let pastFbPosts = [], pastIgPosts = [], scheduledPosts = [];
      const researchPromises = [];

      if (profile.facebookConnected && profile.facebookPageAccessToken) {
        const token = profile.facebookPageAccessToken;
        // FB posts
        researchPromises.push(
          fetch(`${FB_GRAPH}/${profile.facebookPageId}/posts?fields=id,message,created_time,shares,likes.limit(0).summary(true),comments.limit(0).summary(true)&limit=15&access_token=${token}`)
            .then(r => r.json())
            .then(d => { if (d.data) pastFbPosts = d.data.map(p => ({
              message: (p.message || '').substring(0, 120), date: p.created_time,
              day: new Date(p.created_time).toLocaleDateString('en-AU', { weekday: 'long' }),
              time: new Date(p.created_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }),
              likes: p.likes?.summary?.total_count || 0, comments: p.comments?.summary?.total_count || 0,
              shares: p.shares?.count || 0,
              engagement: (p.likes?.summary?.total_count || 0) + (p.comments?.summary?.total_count || 0) * 3 + (p.shares?.count || 0) * 5
            })); })
            .catch(() => {})
        );
        if (profile.instagramBusinessAccountId) {
          researchPromises.push(
            fetch(`${FB_GRAPH}/${profile.instagramBusinessAccountId}/media?fields=id,caption,timestamp,like_count,comments_count&limit=15&access_token=${token}`)
              .then(r => r.json())
              .then(d => { if (d.data) pastIgPosts = d.data.map(p => ({
                caption: (p.caption || '').substring(0, 120), date: p.timestamp,
                day: new Date(p.timestamp).toLocaleDateString('en-AU', { weekday: 'long' }),
                time: new Date(p.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }),
                likes: p.like_count || 0, comments: p.comments_count || 0,
                engagement: (p.like_count || 0) + (p.comments_count || 0) * 3
              })); })
              .catch(() => {})
          );
        }
      }
      // Scheduled posts from DB
      researchPromises.push(
        SocialPost.find({ user: req.user._id, scheduledFor: { $gte: new Date() } }).sort('scheduledFor').lean()
          .then(posts => { scheduledPosts = posts.map(p => ({
            platform: p.platform, topic: p.topic || '', pillar: p.pillar || '',
            scheduledFor: p.scheduledFor,
            day: new Date(p.scheduledFor).toLocaleDateString('en-AU', { weekday: 'long' }),
            status: p.status
          })); })
          .catch(() => {})
      );

      await Promise.all(researchPromises);
      console.log('[Smart Schedule] Research:', pastFbPosts.length, 'FB,', pastIgPosts.length, 'IG,', scheduledPosts.length, 'scheduled');

      return generateSmartSchedule(
        geminiKey, profile.businessName, profile.businessType,
        profile.tone, stats, count || 7, { pastFbPosts, pastIgPosts, scheduledPosts }
      );
    };

    const result = await Promise.race([work(), timeoutPromise]);
    clearTimeout(timer);
    res.json(result);
  } catch (err) {
    clearTimeout(timer);
    console.error('[Smart Schedule] Route error:', err?.message || err);
    res.status(500).json({ message: 'Smart schedule failed', error: err.message });
  }
});

// Insights - research-driven recommendations (55s timeout covers research + AI)
router.post('/ai/recommendations', auth, async (req, res) => {
  let timer;
  try {
    const profile = await SocialProfile.findOne({ user: req.user._id });
    const geminiKey = getGeminiKey(profile);
    if (!geminiKey) {
      return res.status(400).json({ message: 'AI not configured. Contact admin or add your Gemini API key in Settings.' });
    }
    const stats = {
      followers: profile.stats?.followers ?? 0,
      reach: profile.stats?.reach ?? 0,
      engagement: profile.stats?.engagement ?? 0,
      postsLast30Days: profile.stats?.postsLast30Days ?? 0
    };

    // 55s timeout — gives Gemini plenty of time
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Analysis timed out — the AI took too long. Please try again.')), 55000);
    });

    const work = async () => {
      // ── RESEARCH PHASE: Gather real post data in PARALLEL ──
      let pastFbPosts = [], pastIgPosts = [];
      const researchPromises = [];

      if (profile.facebookConnected && profile.facebookPageAccessToken) {
        const token = profile.facebookPageAccessToken;
        researchPromises.push(
          fetch(`${FB_GRAPH}/${profile.facebookPageId}/posts?fields=id,message,created_time,shares,likes.limit(0).summary(true),comments.limit(0).summary(true)&limit=10&access_token=${token}`)
            .then(r => r.json())
            .then(d => { if (d.data) pastFbPosts = d.data.map(p => ({
              message: (p.message || '').substring(0, 100),
              day: new Date(p.created_time).toLocaleDateString('en-AU', { weekday: 'long' }),
              time: new Date(p.created_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }),
              likes: p.likes?.summary?.total_count || 0, comments: p.comments?.summary?.total_count || 0,
              shares: p.shares?.count || 0,
              engagement: (p.likes?.summary?.total_count || 0) + (p.comments?.summary?.total_count || 0) * 3 + (p.shares?.count || 0) * 5
            })); })
            .catch(() => {})
        );
        if (profile.instagramBusinessAccountId) {
          researchPromises.push(
            fetch(`${FB_GRAPH}/${profile.instagramBusinessAccountId}/media?fields=id,caption,timestamp,like_count,comments_count&limit=10&access_token=${token}`)
              .then(r => r.json())
              .then(d => { if (d.data) pastIgPosts = d.data.map(p => ({
                caption: (p.caption || '').substring(0, 100),
                day: new Date(p.timestamp).toLocaleDateString('en-AU', { weekday: 'long' }),
                time: new Date(p.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true }),
                likes: p.like_count || 0, comments: p.comments_count || 0,
                engagement: (p.like_count || 0) + (p.comments_count || 0) * 3
              })); })
              .catch(() => {})
          );
        }
      }

      await Promise.all(researchPromises);
      const postData = { pastFbPosts, pastIgPosts };
      console.log('[Insights] Research:', pastFbPosts.length, 'FB,', pastIgPosts.length, 'IG for', profile.businessName);

      // Run sequentially to avoid Gemini rate-limit delays
      const recs = await generateRecommendations(geminiKey, profile.businessName, profile.businessType, stats, postData);
      const times = await analyzePostTimes(geminiKey, profile.businessType, profile.location || 'Australia', postData);
      return { recommendations: recs, bestTimes: times };
    };

    const result = await Promise.race([work(), timeoutPromise]);
    clearTimeout(timer);
    res.json(result);
  } catch (err) {
    clearTimeout(timer);
    console.error('[Insights] Route error:', err?.message || err);
    res.status(500).json({ message: 'Analysis failed', error: err.message });
  }
});

// ── Subscription & Purchase ──

const PLANS = {
  starter: { name: 'Starter', amount: 49, features: ['AI Content Generation', 'Content Calendar', 'Basic Insights', '1 Brand Profile'] },
  professional: { name: 'Professional', amount: 99, features: ['Everything in Starter', 'Smart AI Scheduler', 'AI Image Generation', 'Advanced Insights', 'White-Label Branding', '3 Brand Profiles'] },
  enterprise: { name: 'Enterprise', amount: 199, features: ['Everything in Professional', 'Custom Domain', 'Priority Support', 'API Access', 'Unlimited Brand Profiles', 'Dedicated Account Manager'] }
};

// Get available plans
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// Purchase / activate a plan
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan. Choose starter, professional, or enterprise.' });

    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.startDate': new Date(),
        'subscription.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        'subscription.lastPayment': new Date(),
        'subscription.amount': PLANS[plan].amount,
        'subscription.currency': 'AUD'
      },
      { new: true, upsert: true }
    );

    res.json({ message: `${PLANS[plan].name} plan activated!`, profile });
  } catch (err) {
    res.status(500).json({ message: 'Subscription failed', error: err.message });
  }
});

// Cancel subscription
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      { 'subscription.status': 'cancelled' },
      { new: true }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json({ message: 'Subscription cancelled. Access remains until end of billing period.', profile });
  } catch (err) {
    res.status(500).json({ message: 'Cancellation failed', error: err.message });
  }
});

// ── White Label ──

// Get white-label settings
router.get('/white-label', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    if (!profile.isSubscribed) return res.status(403).json({ message: 'Active subscription required.' });
    if (profile.subscription.plan === 'starter') return res.status(403).json({ message: 'White-label requires Professional or Enterprise plan.' });
    res.json(profile.whiteLabel);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update white-label settings
router.put('/white-label', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    if (!profile.isSubscribed) return res.status(403).json({ message: 'Active subscription required.' });
    if (profile.subscription.plan === 'starter') return res.status(403).json({ message: 'White-label requires Professional or Enterprise plan.' });

    const allowed = ['brandName', 'tagline', 'logoUrl', 'faviconUrl', 'primaryColor', 'accentColor', 'headerBg', 'buttonColor', 'fontFamily', 'hideByline'];
    if (profile.subscription.plan === 'enterprise') allowed.push('customDomain');

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[`whiteLabel.${key}`] = req.body[key];
    }

    const updated = await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true }
    );
    res.json(updated.whiteLabel);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update branding', error: err.message });
  }
});

// ── Admin: manage subscriptions ──

// Admin: activate subscription for a user
router.post('/admin/subscribe/:userId', auth, adminOnly, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan' });

    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.params.userId },
      {
        user: req.params.userId,
        'subscription.plan': plan,
        'subscription.status': 'active',
        'subscription.startDate': new Date(),
        'subscription.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        'subscription.lastPayment': new Date(),
        'subscription.amount': PLANS[plan].amount,
        'subscription.currency': 'AUD'
      },
      { new: true, upsert: true }
    );
    res.json({ message: `${PLANS[plan].name} plan activated for user`, profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: cancel subscription for a user
router.post('/admin/cancel-subscription/:userId', auth, adminOnly, async (req, res) => {
  try {
    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.params.userId },
      { 'subscription.status': 'cancelled', 'subscription.plan': 'none' },
      { new: true }
    );
    res.json({ message: 'Subscription cancelled', profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: list all subscribers
router.get('/admin/subscribers', auth, adminOnly, async (req, res) => {
  try {
    const subscribers = await SocialProfile.find({
      'subscription.plan': { $ne: 'none' }
    }).populate('user', 'firstName lastName email company');
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Admin: view any user's social data ──

// Admin: get social stats across all users
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [totalPosts, draftPosts, scheduledPosts, postedPosts, totalProfiles] = await Promise.all([
      SocialPost.countDocuments(),
      SocialPost.countDocuments({ status: 'Draft' }),
      SocialPost.countDocuments({ status: 'Scheduled' }),
      SocialPost.countDocuments({ status: 'Posted' }),
      SocialProfile.countDocuments()
    ]);

    const postsByPlatform = await SocialPost.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);

    const recentPosts = await SocialPost.find()
      .populate('user', 'firstName lastName company')
      .sort('-createdAt')
      .limit(10);

    res.json({
      stats: { totalPosts, draftPosts, scheduledPosts, postedPosts, totalProfiles },
      postsByPlatform,
      recentPosts
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: get a specific user's profile
router.get('/admin/profile/:userId', auth, adminOnly, async (req, res) => {
  try {
    const profile = await SocialProfile.findOne({ user: req.params.userId });
    res.json(profile || { message: 'No social profile found for this user' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: update a specific user's profile
router.put('/admin/profile/:userId', auth, adminOnly, async (req, res) => {
  try {
    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.params.userId },
      { ...req.body, user: req.params.userId },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Facebook / Instagram Integration ──

const FB_GRAPH = 'https://graph.facebook.com/v21.0';

// Connect Facebook Page — save page access token + page ID
// Accepts either a Page Access Token OR a User Access Token.
// If a User token is provided, we auto-exchange it for the correct Page token.
router.post('/facebook/connect', auth, async (req, res) => {
  try {
    const { pageId, pageAccessToken } = req.body;
    if (!pageId || !pageAccessToken) {
      return res.status(400).json({ message: 'Page ID and Page Access Token are required.' });
    }

    let finalPageToken = pageAccessToken;

    // Step 1: Try the token directly against the page
    let verifyRes = await fetch(`${FB_GRAPH}/${pageId}?fields=name,fan_count,picture&access_token=${finalPageToken}`);
    let pageData = await verifyRes.json();

    // Step 2: If it failed, the token might be a User Access Token — try auto-exchanging
    if (pageData.error) {
      console.log(`[FB Connect] Direct page query failed: ${pageData.error.message}. Trying me/accounts...`);

      // Query me/accounts to list pages the user manages and get the correct Page token
      const accountsRes = await fetch(`${FB_GRAPH}/me/accounts?fields=id,name,access_token&access_token=${pageAccessToken}`);
      const accountsData = await accountsRes.json();

      if (accountsData.error) {
        // Token is completely invalid
        return res.status(400).json({
          message: `Facebook error: ${accountsData.error.message}. Make sure your token has pages_show_list, pages_read_engagement, and pages_read_user_content permissions.`
        });
      }

      if (!accountsData.data || accountsData.data.length === 0) {
        return res.status(400).json({
          message: 'No Facebook Pages found for this token. Make sure the token belongs to an account that manages at least one Facebook Page, and that pages_show_list permission is granted.'
        });
      }

      // Find the matching page by ID
      const matchedPage = accountsData.data.find(p => p.id === pageId);
      if (!matchedPage) {
        const availablePages = accountsData.data.map(p => `"${p.name}" (${p.id})`).join(', ');
        return res.status(400).json({
          message: `Page ID ${pageId} not found in your managed pages. Available pages: ${availablePages}. Use one of these Page IDs instead.`
        });
      }

      // Use the Page Access Token from me/accounts
      finalPageToken = matchedPage.access_token;
      console.log(`[FB Connect] Auto-exchanged user token for page token for "${matchedPage.name}"`);

      // Re-verify with the correct Page token
      verifyRes = await fetch(`${FB_GRAPH}/${pageId}?fields=name,fan_count,picture&access_token=${finalPageToken}`);
      pageData = await verifyRes.json();

      if (pageData.error) {
        return res.status(400).json({ message: `Facebook error after token exchange: ${pageData.error.message}` });
      }
    }

    // Check for linked Instagram Business Account
    const igRes = await fetch(`${FB_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${finalPageToken}`);
    const igData = await igRes.json();
    const igId = igData?.instagram_business_account?.id || '';

    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        facebookPageId: pageId,
        facebookPageAccessToken: finalPageToken,
        facebookConnected: true,
        instagramBusinessAccountId: igId
      },
      { new: true, upsert: true }
    );

    res.json({
      message: `Connected to "${pageData.name}"${igId ? ' + Instagram Business linked' : ''}`,
      pageName: pageData.name,
      pageFollowers: pageData.fan_count,
      pagePicture: pageData.picture?.data?.url,
      instagramConnected: !!igId,
      instagramId: igId,
      profile
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to connect Facebook page', error: err.message });
  }
});

// Disconnect Facebook Page
router.post('/facebook/disconnect', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        facebookPageId: '',
        facebookPageAccessToken: '',
        facebookConnected: false,
        instagramBusinessAccountId: ''
      },
      { new: true }
    );
    res.json({ message: 'Facebook page disconnected', profile });
  } catch (err) {
    res.status(500).json({ message: 'Disconnect failed', error: err.message });
  }
});

// Fetch live stats from Facebook Page + Instagram
router.get('/facebook/stats', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile?.facebookConnected || !profile?.facebookPageAccessToken) {
      return res.status(400).json({ message: 'Facebook not connected' });
    }

    const token = profile.facebookPageAccessToken;
    const pageId = profile.facebookPageId;

    // Page info + fan count
    const pageRes = await fetch(`${FB_GRAPH}/${pageId}?fields=name,fan_count,picture,followers_count&access_token=${token}`);
    const pageData = await pageRes.json();
    if (pageData.error) return res.status(400).json({ message: pageData.error.message });

    // Page insights (28-day reach + engagement)
    let reach = 0, engagement = 0, impressions = 0;
    try {
      const insightsRes = await fetch(
        `${FB_GRAPH}/${pageId}/insights?metric=page_impressions_unique,page_post_engagements,page_impressions&period=days_28&access_token=${token}`
      );
      const insightsData = await insightsRes.json();
      if (insightsData.data) {
        for (const metric of insightsData.data) {
          const val = metric.values?.[metric.values.length - 1]?.value || 0;
          if (metric.name === 'page_impressions_unique') reach = val;
          if (metric.name === 'page_post_engagements') engagement = val;
          if (metric.name === 'page_impressions') impressions = val;
        }
      }
    } catch (e) { /* insights may not be available for all pages */ }

    // Recent posts count (last 30 days)
    let recentPostCount = 0;
    try {
      const postsRes = await fetch(
        `${FB_GRAPH}/${pageId}/posts?fields=id&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&access_token=${token}`
      );
      const postsData = await postsRes.json();
      recentPostCount = postsData.data?.length || 0;
    } catch (e) {}

    // Instagram stats if linked
    let igStats = null;
    if (profile.instagramBusinessAccountId) {
      try {
        const igRes = await fetch(
          `${FB_GRAPH}/${profile.instagramBusinessAccountId}?fields=followers_count,media_count,username,profile_picture_url&access_token=${token}`
        );
        const igData = await igRes.json();
        if (!igData.error) {
          igStats = {
            followers: igData.followers_count,
            mediaCount: igData.media_count,
            username: igData.username,
            profilePicture: igData.profile_picture_url
          };
        }
      } catch (e) {}
    }

    const followers = pageData.fan_count || pageData.followers_count || 0;
    const engagementRate = impressions > 0 ? ((engagement / impressions) * 100).toFixed(1) : 0;

    // Update stored stats
    await SocialProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        'stats.followers': followers,
        'stats.reach': reach,
        'stats.engagement': parseFloat(engagementRate),
        'stats.postsLast30Days': recentPostCount
      }
    );

    res.json({
      page: {
        name: pageData.name,
        picture: pageData.picture?.data?.url,
        followers,
        reach,
        engagement,
        engagementRate: parseFloat(engagementRate),
        impressions,
        postsLast30Days: recentPostCount
      },
      instagram: igStats
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

// Fetch recent Facebook Page posts
router.get('/facebook/posts', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile?.facebookConnected || !profile?.facebookPageAccessToken) {
      return res.status(400).json({ message: 'Facebook not connected' });
    }

    const token = profile.facebookPageAccessToken;
    const pageId = profile.facebookPageId;
    const limit = req.query.limit || 10;

    const postsRes = await fetch(
      `${FB_GRAPH}/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,likes.limit(0).summary(true),comments.limit(0).summary(true)&limit=${limit}&access_token=${token}`
    );
    const postsData = await postsRes.json();
    if (postsData.error) return res.status(400).json({ message: postsData.error.message });

    const posts = (postsData.data || []).map(p => ({
      id: p.id,
      message: p.message || '',
      createdTime: p.created_time,
      image: p.full_picture || null,
      permalink: p.permalink_url,
      likes: p.likes?.summary?.total_count || 0,
      comments: p.comments?.summary?.total_count || 0,
      shares: p.shares?.count || 0
    }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
});

// Fetch recent Instagram posts (if linked)
router.get('/instagram/posts', auth, async (req, res) => {
  try {
    const profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile?.instagramBusinessAccountId || !profile?.facebookPageAccessToken) {
      return res.status(400).json({ message: 'Instagram not connected' });
    }

    const token = profile.facebookPageAccessToken;
    const igId = profile.instagramBusinessAccountId;
    const limit = req.query.limit || 10;

    const mediaRes = await fetch(
      `${FB_GRAPH}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) return res.status(400).json({ message: mediaData.error.message });

    const posts = (mediaData.data || []).map(p => ({
      id: p.id,
      caption: p.caption || '',
      mediaType: p.media_type,
      mediaUrl: p.media_url || p.thumbnail_url,
      permalink: p.permalink,
      timestamp: p.timestamp,
      likes: p.like_count || 0,
      comments: p.comments_count || 0
    }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch Instagram posts', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  AI VIDEO GENERATION (Runway ML)
//  Admin provides RUNWAY_API_KEY in env — premium users access it
// ═══════════════════════════════════════════════════════════════

const RUNWAY_KEY = process.env.RUNWAY_API_KEY;

// Check if video generation is available
router.get('/ai/video/status', auth, async (req, res) => {
  const profile = await SocialProfile.findOne({ user: req.user._id });
  const plan = profile?.subscription?.plan || 'none';
  const canVideo = plan === 'professional' || plan === 'enterprise';
  res.json({
    available: !!RUNWAY_KEY && canVideo,
    configured: !!RUNWAY_KEY,
    planRequired: !canVideo,
    plan
  });
});

// Start video generation from an image URL + prompt
router.post('/ai/video/generate', auth, async (req, res) => {
  try {
    if (!RUNWAY_KEY) return res.status(503).json({ message: 'AI video generation is not configured. Contact admin.' });

    const profile = await SocialProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const plan = profile.subscription?.plan || 'none';
    if (plan !== 'professional' && plan !== 'enterprise') {
      return res.status(403).json({ message: 'AI Video requires Professional or Enterprise plan.' });
    }

    const { imageUrl, prompt, duration, ratio } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'Image URL is required. Generate an AI image first.' });

    const result = await generateVideoFromImage(RUNWAY_KEY, imageUrl, prompt || 'Smooth professional promotional video with subtle cinematic motion', {
      duration: duration || 5,
      ratio: ratio || '16:9'
    });

    res.json({ taskId: result.taskId, message: 'Video generation started. This takes 30-90 seconds.' });
  } catch (err) {
    console.error('[Video Generate] Error:', err.message);
    res.status(500).json({ message: err.message || 'Video generation failed' });
  }
});

// Poll video task status
router.get('/ai/video/task/:taskId', auth, async (req, res) => {
  try {
    if (!RUNWAY_KEY) return res.status(503).json({ message: 'Video service not configured.' });

    const status = await getTaskStatus(RUNWAY_KEY, req.params.taskId);
    res.json(status);
  } catch (err) {
    console.error('[Video Status] Error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to check video status' });
  }
});

// Cancel a running video task
router.post('/ai/video/cancel/:taskId', auth, async (req, res) => {
  try {
    if (!RUNWAY_KEY) return res.status(503).json({ message: 'Video service not configured.' });
    await cancelTask(RUNWAY_KEY, req.params.taskId);
    res.json({ message: 'Task cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to cancel' });
  }
});

// ── Facebook Publishing ──

// Shared helper: post text+image to a Facebook Page via Graph API
const postToFacebookPage = async (pageId, pageAccessToken, message, imageUrl) => {
  if (imageUrl && imageUrl.startsWith('data:')) {
    // Base64 image → upload as photo
    const base64 = imageUrl.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    const formData = new (require('form-data'))();
    formData.append('source', buf, { filename: 'post.jpg', contentType: 'image/jpeg' });
    formData.append('message', message);
    formData.append('access_token', pageAccessToken);
    const photoRes = await fetch(`${FB_GRAPH}/${pageId}/photos`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    const photoData = await photoRes.json();
    if (photoData.error) throw new Error(photoData.error.message);
    return photoData;
  } else if (imageUrl) {
    // URL-based image
    const photoRes = await fetch(`${FB_GRAPH}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, message, access_token: pageAccessToken })
    });
    const photoData = await photoRes.json();
    if (photoData.error) throw new Error(photoData.error.message);
    return photoData;
  } else {
    const feedRes = await fetch(`${FB_GRAPH}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageAccessToken })
    });
    const feedData = await feedRes.json();
    if (feedData.error) throw new Error(feedData.error.message);
    return feedData;
  }
};

// Publish a single post to Facebook now (manual trigger from calendar)
router.post('/posts/:id/publish', auth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (req.user.role === 'customer' && post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const profile = await SocialProfile.findOne({ user: post.user });
    if (!profile?.facebookConnected || !profile?.facebookPageAccessToken) {
      return res.status(400).json({ message: 'Facebook not connected. Connect in Settings first.' });
    }

    const hashtags = (post.hashtags || []).length > 0 ? '\n\n' + post.hashtags.join(' ') : '';
    const message = `${post.content}${hashtags}`;

    await postToFacebookPage(profile.facebookPageId, profile.facebookPageAccessToken, message, post.image || null);

    post.status = 'Posted';
    post.publishedAt = new Date();
    post.publishError = null;
    await post.save();

    res.json({ message: 'Published to Facebook!', post });
  } catch (err) {
    // Store error on post so user can see it
    try {
      await SocialPost.findByIdAndUpdate(req.params.id, { publishError: err.message });
    } catch (_) {}
    res.status(500).json({ message: `Publish failed: ${err.message}` });
  }
});

// Publish all due scheduled posts (called by polling or manual "Run Publisher" button)
router.post('/publish-scheduled', auth, async (req, res) => {
  try {
    const now = new Date();

    // Find scheduled posts due now — scoped to user unless admin
    const query = {
      status: 'Scheduled',
      scheduledFor: { $lte: now }
    };
    if (req.user.role === 'customer') query.user = req.user._id;

    const duePosts = await SocialPost.find(query).populate('user', '_id');
    if (duePosts.length === 0) {
      return res.json({ published: 0, failed: 0, message: 'No posts due right now.', errors: [] });
    }

    let published = 0;
    let failed = 0;
    const errors = [];

    for (const post of duePosts) {
      try {
        const profile = await SocialProfile.findOne({ user: post.user._id });
        if (!profile?.facebookConnected || !profile?.facebookPageAccessToken) {
          errors.push(`Post ${post._id}: Facebook not connected`);
          failed++;
          continue;
        }

        const hashtags = (post.hashtags || []).length > 0 ? '\n\n' + post.hashtags.join(' ') : '';
        const message = `${post.content}${hashtags}`;

        await postToFacebookPage(profile.facebookPageId, profile.facebookPageAccessToken, message, post.image || null);

        post.status = 'Posted';
        post.publishedAt = new Date();
        post.publishError = null;
        await post.save();
        published++;
      } catch (err) {
        failed++;
        const errMsg = err.message?.substring(0, 200) || 'Unknown error';
        errors.push(`Post ${post._id}: ${errMsg}`);
        try { post.publishError = errMsg; await post.save(); } catch (_) {}
      }
    }

    const message = published > 0
      ? `Published ${published} post(s)${failed > 0 ? `, ${failed} failed` : ''}.`
      : `${failed} post(s) failed to publish.`;

    res.json({ published, failed, message, errors });
  } catch (err) {
    res.status(500).json({ message: 'Publisher error', error: err.message });
  }
});

module.exports = router;
