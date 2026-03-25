const express = require('express');
const HostingOrder = require('../models/HostingOrder');
const SiteSettings = require('../models/SiteSettings');
const { auth, adminOnly } = require('../middleware/auth');
const { sendEmail, adminNotificationEmail } = require('../utils/email');

const router = express.Router();

// Customer: submit hosting order
router.post('/order', auth, async (req, res) => {
  try {
    const {
      planKey, billingCycle, domainName, domainAction,
      businessName, contactName, contactEmail, contactPhone,
      currentHost, websiteType, additionalNotes
    } = req.body;

    const settings = await SiteSettings.getSettings();
    const plan = (settings.hostingPlans || []).find(p => p.key === planKey && p.isActive);
    if (!plan) return res.status(400).json({ message: 'Invalid hosting plan' });

    const amount = billingCycle === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

    const order = new HostingOrder({
      user: req.user._id,
      planKey: plan.key,
      planName: plan.name,
      amount,
      billingCycle: billingCycle || 'monthly',
      domainName,
      domainAction: domainAction || 'register-new',
      businessName,
      contactName: contactName || `${req.user.firstName} ${req.user.lastName}`,
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      currentHost,
      websiteType: websiteType || 'wordpress',
      additionalNotes
    });
    await order.save();

    // Notify admin
    try {
      const adminEmail = settings.businessEmail || process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `New Hosting Order: ${plan.name} — ${domainName}`,
          html: `<h2>New Hosting Order</h2>
            <p><strong>Customer:</strong> ${req.user.firstName} ${req.user.lastName} (${req.user.email})</p>
            <p><strong>Plan:</strong> ${plan.name} — $${amount}/${billingCycle}</p>
            <p><strong>Domain:</strong> ${domainName} (${domainAction})</p>
            <p><strong>Website Type:</strong> ${websiteType}</p>
            <p><strong>Notes:</strong> ${additionalNotes || 'None'}</p>`
        });
      }
    } catch (emailErr) {
      console.log('Admin notification email failed:', emailErr.message);
    }

    res.status(201).json({ message: 'Hosting order submitted! We will be in touch within 24 hours to set up your hosting.', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Customer: get my hosting orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await HostingOrder.find({ user: req.user._id }).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: get all hosting orders
router.get('/admin/orders', auth, adminOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    const orders = await HostingOrder.find(query)
      .populate('user', 'firstName lastName email company')
      .sort('-createdAt');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: update hosting order status
router.put('/admin/orders/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status, sitegroundSiteId, adminNotes } = req.body;
    const update = {};
    if (status) update.status = status;
    if (sitegroundSiteId) update.sitegroundSiteId = sitegroundSiteId;
    if (adminNotes !== undefined) update.adminNotes = adminNotes;
    if (status === 'active') update.provisionedAt = new Date();

    const order = await HostingOrder.findByIdAndUpdate(req.params.id, { $set: update }, { new: true })
      .populate('user', 'firstName lastName email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json({ message: 'Order updated', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
