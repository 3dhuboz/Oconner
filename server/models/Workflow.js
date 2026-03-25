const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'skipped'], default: 'pending' },
  dueDate: { type: Date },
  completedAt: { type: Date },
  order: { type: Number, required: true },
  dependencies: [{ type: Number }],
  automationTrigger: { type: String },
  data: { type: mongoose.Schema.Types.Mixed }
});

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: ['onboarding', 'project-delivery', 'support', 'maintenance', 'custom'],
    default: 'custom'
  },
  steps: [stepSchema],
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
  isTemplate: { type: Boolean, default: false },
  tags: [{ type: String }],
  dueDate: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Workflow', workflowSchema);
