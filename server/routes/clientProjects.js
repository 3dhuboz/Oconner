const express = require('express');
const ClientProject = require('../models/ClientProject');
const User = require('../models/User');
const AppDefinition = require('../models/AppDefinition');
const AppSubscription = require('../models/AppSubscription');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Default checklist for new projects
const DEFAULT_CHECKLIST = [
  { step: 'Create customer account in Admin → Customers', completed: false },
  { step: 'Issue app licenses (Admin → Customers → Issue License)', completed: false },
  { step: 'Create new Render Web Service from same GitHub repo', completed: false },
  { step: 'Configure Render env vars (MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, etc.)', completed: false },
  { step: 'Create separate MongoDB database/cluster for client', completed: false },
  { step: 'Set client custom domain on Render (if applicable)', completed: false },
  { step: 'Configure white-label branding (logo, colors, name)', completed: false },
  { step: 'Test client login and app functionality', completed: false },
  { step: 'Send client their login credentials', completed: false },
  { step: 'Create initial invoice via Square', completed: false }
];

// Default env vars to track
const DEFAULT_ENV_VARS = [
  { key: 'NODE_ENV', description: 'Set to production', isSet: false },
  { key: 'MONGODB_URI', description: 'Client-specific MongoDB connection string', isSet: false },
  { key: 'JWT_SECRET', description: 'Unique JWT secret for this deployment', isSet: false },
  { key: 'ADMIN_EMAIL', description: 'Client admin email', isSet: false },
  { key: 'ADMIN_PASSWORD', description: 'Client admin password', isSet: false },
  { key: 'GEMINI_API_KEY', description: 'Admin-managed Gemini AI key', isSet: false },
  { key: 'RUNWAY_API_KEY', description: 'Admin-managed Runway ML key (if video features)', isSet: false },
  { key: 'GOOGLE_CLIENT_ID', description: 'Google OAuth client ID (if Google login)', isSet: false },
  { key: 'SQUARE_ACCESS_TOKEN', description: 'Square payments token', isSet: false },
  { key: 'SQUARE_LOCATION_ID', description: 'Square location ID', isSet: false }
];

// GET all client projects (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const projects = await ClientProject.find()
      .populate('client', 'firstName lastName email company')
      .populate('apps.subscription')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load projects', error: err.message });
  }
});

// GET single project
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const project = await ClientProject.findById(req.params.id)
      .populate('client', 'firstName lastName email company phone')
      .populate('apps.subscription');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load project', error: err.message });
  }
});

// GET project stats (admin only)
router.get('/stats/summary', auth, adminOnly, async (req, res) => {
  try {
    const total = await ClientProject.countDocuments();
    const active = await ClientProject.countDocuments({ status: 'active' });
    const setup = await ClientProject.countDocuments({ status: 'setup' });
    const live = await ClientProject.countDocuments({ 'deployment.deployStatus': 'live' });
    const projects = await ClientProject.find({ status: { $in: ['active', 'setup'] } });
    const totalRevenue = projects.reduce((sum, p) => sum + (p.monthlyRevenue || 0), 0);
    res.json({ total, active, setup, live, totalMonthlyRevenue: totalRevenue });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load stats', error: err.message });
  }
});

// CREATE new project
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { clientId, projectName, businessName, contactName, contactEmail, contactPhone, appSlugs, notes } = req.body;

    // Verify client exists
    const client = await User.findById(clientId);
    if (!client) return res.status(400).json({ message: 'Customer not found' });

    // Build apps array from slugs
    const apps = [];
    if (appSlugs && appSlugs.length > 0) {
      for (const slug of appSlugs) {
        const appDef = await AppDefinition.findOne({ slug });
        if (appDef) {
          // Check if subscription exists
          const sub = await AppSubscription.findOne({ user: clientId, app: appDef._id, status: 'active' });
          apps.push({
            slug: appDef.slug,
            name: appDef.name,
            subscription: sub?._id || null,
            planKey: sub?.planKey || ''
          });
        }
      }
    }

    const project = new ClientProject({
      client: clientId,
      projectName,
      businessName: businessName || client.company || '',
      contactName: contactName || `${client.firstName} ${client.lastName}`,
      contactEmail: contactEmail || client.email,
      contactPhone: contactPhone || client.phone || '',
      apps,
      setupChecklist: DEFAULT_CHECKLIST.map(s => ({ ...s })),
      envVars: DEFAULT_ENV_VARS.map(v => ({ ...v })),
      notes: notes || ''
    });

    await project.save();
    const populated = await ClientProject.findById(project._id)
      .populate('client', 'firstName lastName email company');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create project', error: err.message });
  }
});

// UPDATE project
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const project = await ClientProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Update allowed fields
    const allowedFields = [
      'projectName', 'businessName', 'contactName', 'contactEmail', 'contactPhone',
      'deployment', 'whiteLabel', 'notes', 'status', 'monthlyRevenue', 'apps', 'envVars',
      'localProjectPath'
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    }

    await project.save();
    const populated = await ClientProject.findById(project._id)
      .populate('client', 'firstName lastName email company');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project', error: err.message });
  }
});

// UPDATE checklist item
router.put('/:id/checklist/:stepIndex', auth, adminOnly, async (req, res) => {
  try {
    const project = await ClientProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const idx = parseInt(req.params.stepIndex);
    if (idx < 0 || idx >= project.setupChecklist.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }
    project.setupChecklist[idx].completed = req.body.completed;
    project.setupChecklist[idx].completedAt = req.body.completed ? new Date() : null;
    if (req.body.notes !== undefined) project.setupChecklist[idx].notes = req.body.notes;

    // Auto-update status: if all checklist items done → active
    const allDone = project.setupChecklist.every(s => s.completed);
    if (allDone && project.status === 'setup') {
      project.status = 'active';
    }

    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update checklist', error: err.message });
  }
});

// AUTO-DEPLOY to Render — one-click deployment
router.post('/:id/deploy', auth, adminOnly, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID;
    if (!RENDER_API_KEY || !RENDER_OWNER_ID) {
      return res.status(400).json({ message: 'Set RENDER_API_KEY and RENDER_OWNER_ID in your server environment variables first.' });
    }

    const project = await ClientProject.findById(req.params.id).populate('client', 'firstName lastName email');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.deployment?.serviceId) {
      return res.status(400).json({ message: 'This project already has a Render service. Delete it on Render first if you want to redeploy.' });
    }

    // Generate client-specific values
    const crypto = require('crypto');
    const slugName = project.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 40);
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const adminPassword = req.body.adminPassword || crypto.randomBytes(8).toString('base64').substring(0, 12);
    const adminEmail = project.contactEmail || project.client?.email || '';

    // Build client-specific MongoDB URI (same cluster, different database)
    const baseMongoUri = process.env.MONGODB_URI || '';
    const clientDbName = `client-${slugName}`;
    let clientMongoUri = baseMongoUri;
    if (baseMongoUri.includes('mongodb.net/')) {
      clientMongoUri = baseMongoUri.replace(/mongodb\.net\/[^?]*/, `mongodb.net/${clientDbName}`);
    } else if (baseMongoUri.includes('mongodb.net')) {
      clientMongoUri = baseMongoUri.replace('mongodb.net', `mongodb.net/${clientDbName}`);
    }

    // Render API: Create Web Service
    const repoUrl = req.body.repoUrl || 'https://github.com/3dhuboz/Penny-Wise-IT';
    const branch = req.body.branch || 'main';

    // Build app slug list from project apps
    const appSlugs = (project.apps || []).map(a => a.appSlug || a).join(',');
    const brandName = project.whiteLabel?.brandName || project.businessName || project.projectName;

    const envVars = [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'MONGODB_URI', value: clientMongoUri },
      { key: 'JWT_SECRET', value: jwtSecret },
      { key: 'ADMIN_EMAIL', value: adminEmail },
      { key: 'ADMIN_PASSWORD', value: adminPassword },
      // Client mode gating
      { key: 'CLIENT_MODE', value: 'true' },
      { key: 'ENABLED_APPS', value: appSlugs || 'socialai' },
      { key: 'BRAND_NAME', value: brandName },
    ];
    // Pass through shared API keys if set
    if (process.env.GEMINI_API_KEY) envVars.push({ key: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY });
    if (process.env.RUNWAY_API_KEY) envVars.push({ key: 'RUNWAY_API_KEY', value: process.env.RUNWAY_API_KEY });
    if (process.env.GOOGLE_CLIENT_ID) envVars.push({ key: 'GOOGLE_CLIENT_ID', value: process.env.GOOGLE_CLIENT_ID });

    const renderBody = {
      type: 'web_service',
      name: slugName,
      ownerId: RENDER_OWNER_ID,
      repo: repoUrl,
      autoDeploy: 'yes',
      branch,
      serviceDetails: {
        env: 'node',
        envSpecificDetails: {
          buildCommand: 'cd client && npm install && npm run build && cd ../server && npm install',
          startCommand: 'node server/index.js'
        },
        plan: req.body.plan || 'free',
        region: req.body.region || 'oregon',
        numInstances: 1
      },
      envVars
    };

    console.log('[Deploy] Creating Render service:', slugName, 'for', project.projectName);

    const renderRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(renderBody)
    });

    const renderData = await renderRes.json();

    if (!renderRes.ok) {
      console.error('[Deploy] Render API error:', renderData);
      return res.status(renderRes.status).json({
        message: 'Render deployment failed: ' + (renderData?.message || renderData?.error || JSON.stringify(renderData)),
        error: renderData?.message || renderData?.error || JSON.stringify(renderData)
      });
    }

    const serviceId = renderData.service?.id || renderData.id;
    const rawUrl = renderData.service?.serviceDetails?.url || `${slugName}.onrender.com`;
    const serviceUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

    // Update project with deployment info
    project.deployment = {
      provider: 'render',
      serviceId: serviceId,
      serviceName: slugName,
      serviceUrl: serviceUrl,
      customDomain: '',
      branch,
      repoUrl,
      lastDeployed: new Date(),
      deployStatus: 'deploying'
    };

    // Update env var tracking
    project.envVars = envVars.map(v => ({
      key: v.key,
      description: v.key === 'ADMIN_PASSWORD' ? 'Client admin password' : '',
      isSet: true
    }));

    // Auto-check deployment-related checklist items
    for (const step of project.setupChecklist) {
      if (step.step.includes('Render Web Service') || step.step.includes('Render env vars') || step.step.includes('separate MongoDB')) {
        step.completed = true;
        step.completedAt = new Date();
        step.notes = 'Auto-completed by one-click deploy';
      }
    }

    await project.save();

    res.json({
      message: `Deployment started! Service "${slugName}" is being created on Render.`,
      serviceId,
      serviceUrl,
      adminEmail,
      adminPassword,
      deployStatus: 'deploying'
    });
  } catch (err) {
    console.error('[Deploy] Error:', err);
    res.status(500).json({ message: 'Deployment failed', error: err.message });
  }
});

// REDEPLOY a single client's Render service (triggers rebuild from latest main)
router.post('/:id/redeploy', auth, adminOnly, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    if (!RENDER_API_KEY) return res.status(400).json({ message: 'RENDER_API_KEY not set' });

    const project = await ClientProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.deployment?.serviceId) return res.status(400).json({ message: 'No Render service linked to this project' });

    const renderRes = await fetch(`https://api.render.com/v1/services/${project.deployment.serviceId}/deploys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearCache: req.body.clearCache || false })
    });

    if (!renderRes.ok) {
      const err = await renderRes.json().catch(() => ({}));
      return res.status(renderRes.status).json({ message: 'Redeploy failed', error: err.message || JSON.stringify(err) });
    }

    const deployData = await renderRes.json();
    project.deployment.lastDeployed = new Date();
    project.deployment.deployStatus = 'deploying';
    await project.save();

    console.log('[Redeploy]', project.projectName, '→ deploy', deployData.id || deployData.deploy?.id);
    res.json({ message: `Redeployment triggered for ${project.projectName}`, deployId: deployData.id || deployData.deploy?.id });
  } catch (err) {
    console.error('[Redeploy] Error:', err);
    res.status(500).json({ message: 'Redeploy failed', error: err.message });
  }
});

// REDEPLOY ALL live client services at once
router.post('/actions/redeploy-all', auth, adminOnly, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    if (!RENDER_API_KEY) return res.status(400).json({ message: 'RENDER_API_KEY not set' });

    const projects = await ClientProject.find({ 'deployment.serviceId': { $exists: true, $ne: '' }, status: { $in: ['active', 'setup'] } });
    if (projects.length === 0) return res.json({ message: 'No deployed projects found', results: [] });

    const results = [];
    for (const project of projects) {
      try {
        const renderRes = await fetch(`https://api.render.com/v1/services/${project.deployment.serviceId}/deploys`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearCache: false })
        });
        const ok = renderRes.ok;
        if (ok) {
          project.deployment.lastDeployed = new Date();
          project.deployment.deployStatus = 'deploying';
          await project.save();
        }
        results.push({ project: project.projectName, success: ok, status: ok ? 'deploying' : 'failed' });
      } catch (err) {
        results.push({ project: project.projectName, success: false, error: err.message });
      }
    }

    console.log('[Redeploy All]', results.length, 'services triggered');
    res.json({ message: `Triggered redeployment for ${results.filter(r => r.success).length}/${results.length} services`, results });
  } catch (err) {
    console.error('[Redeploy All] Error:', err);
    res.status(500).json({ message: 'Redeploy all failed', error: err.message });
  }
});

// CHECK deploy status for a client's Render service
router.get('/:id/deploy-status', auth, adminOnly, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    if (!RENDER_API_KEY) return res.status(400).json({ message: 'RENDER_API_KEY not set' });

    const project = await ClientProject.findById(req.params.id);
    if (!project?.deployment?.serviceId) return res.status(404).json({ message: 'No Render service linked' });

    const renderRes = await fetch(`https://api.render.com/v1/services/${project.deployment.serviceId}/deploys?limit=1`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}` }
    });

    if (!renderRes.ok) return res.status(renderRes.status).json({ message: 'Failed to fetch deploy status' });

    const deploys = await renderRes.json();
    const latest = deploys[0]?.deploy || deploys[0] || {};
    const status = latest.status || 'unknown';

    // Update project status if changed
    const mappedStatus = status === 'live' ? 'live' : status === 'build_in_progress' || status === 'update_in_progress' ? 'deploying' : status === 'deactivated' ? 'suspended' : status === 'build_failed' ? 'failed' : project.deployment.deployStatus;
    if (mappedStatus !== project.deployment.deployStatus) {
      project.deployment.deployStatus = mappedStatus;
      await project.save();
    }

    res.json({ status: mappedStatus, renderStatus: status, createdAt: latest.createdAt, finishedAt: latest.finishedAt });
  } catch (err) {
    res.status(500).json({ message: 'Status check failed', error: err.message });
  }
});

// GET local env config for a client project (fetches Render env vars)
router.get('/:id/local-env', auth, adminOnly, async (req, res) => {
  try {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    if (!RENDER_API_KEY) return res.status(400).json({ message: 'RENDER_API_KEY not set' });

    const project = await ClientProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.deployment?.serviceId) return res.status(400).json({ message: 'No Render service linked' });

    const renderRes = await fetch(`https://api.render.com/v1/services/${project.deployment.serviceId}/env-vars`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Accept': 'application/json' }
    });

    if (!renderRes.ok) return res.status(renderRes.status).json({ message: 'Failed to fetch env vars from Render' });

    const envVars = await renderRes.json();
    const envLines = ['# Local dev config for: ' + (project.projectName || project.businessName || 'Client Project')];
    envLines.push('# Generated: ' + new Date().toISOString());
    envLines.push('# Service: ' + (project.deployment.serviceUrl || project.deployment.serviceId));
    envLines.push('PORT=5000');

    for (const item of envVars) {
      const ev = item.envVar || item;
      if (ev.key === 'NODE_ENV') {
        envLines.push('NODE_ENV=development');
      } else if (ev.key === 'PORT') {
        // Skip — already set above
      } else {
        envLines.push(`${ev.key}=${ev.value}`);
      }
    }

    // Ensure CLIENT_MODE is present
    if (!envVars.find(v => (v.envVar || v).key === 'CLIENT_MODE')) {
      envLines.push('CLIENT_MODE=true');
    }

    const slug = (project.projectName || project.businessName || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    res.json({
      filename: `.env.client-${slug}`,
      slug,
      projectName: project.projectName || project.businessName,
      serviceUrl: project.deployment.serviceUrl,
      envContent: envLines.join('\n') + '\n',
      runCommand: `$env:ENV_FILE='.env.client-${slug}'; npx nodemon server/index.js`
    });
  } catch (err) {
    console.error('[Local Env] Error:', err);
    res.status(500).json({ message: 'Failed to generate local config', error: err.message });
  }
});

// DELETE project
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await ClientProject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project', error: err.message });
  }
});

module.exports = router;
