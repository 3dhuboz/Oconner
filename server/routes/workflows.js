const express = require('express');
const Workflow = require('../models/Workflow');
const { auth, staffOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get workflows (customers see their own, staff/admin see all)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
      query.isTemplate = false;
    }
    if (req.query.template === 'true') query.isTemplate = true;
    if (req.query.status) query.status = req.query.status;

    const workflows = await Workflow.find(query)
      .populate('customer', 'firstName lastName email company')
      .populate('createdBy', 'firstName lastName')
      .sort('-createdAt');

    res.json(workflows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single workflow
router.get('/:id', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('customer', 'firstName lastName email company')
      .populate('createdBy', 'firstName lastName')
      .populate('steps.assignedTo', 'firstName lastName');

    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    if (req.user.role === 'customer' && workflow.customer?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create workflow (staff/admin)
router.post('/', auth, staffOrAdmin, async (req, res) => {
  try {
    const workflow = new Workflow({ ...req.body, createdBy: req.user._id });
    await workflow.save();
    await workflow.populate('customer', 'firstName lastName email company');
    res.status(201).json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update workflow (staff/admin)
router.put('/:id', auth, staffOrAdmin, async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('customer', 'firstName lastName email company')
      .populate('createdBy', 'firstName lastName');

    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update workflow step status
router.put('/:id/steps/:stepIndex', auth, async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const stepIdx = parseInt(req.params.stepIndex);
    if (stepIdx < 0 || stepIdx >= workflow.steps.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }

    workflow.steps[stepIdx].status = req.body.status;
    if (req.body.status === 'completed') {
      workflow.steps[stepIdx].completedAt = new Date();
    }

    const allCompleted = workflow.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    if (allCompleted) {
      workflow.status = 'completed';
      workflow.completedAt = new Date();
    }

    await workflow.save();
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create workflow from template
router.post('/from-template/:templateId', auth, staffOrAdmin, async (req, res) => {
  try {
    const template = await Workflow.findById(req.params.templateId);
    if (!template || !template.isTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const workflow = new Workflow({
      name: req.body.name || template.name,
      description: template.description,
      customer: req.body.customerId,
      createdBy: req.user._id,
      category: template.category,
      steps: template.steps.map(s => ({ ...s.toObject(), _id: undefined, status: 'pending', completedAt: null })),
      status: 'active',
      isTemplate: false,
      tags: template.tags
    });

    await workflow.save();
    await workflow.populate('customer', 'firstName lastName email company');
    res.status(201).json(workflow);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete workflow (admin)
router.delete('/:id', auth, staffOrAdmin, async (req, res) => {
  try {
    await Workflow.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
