const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  attachments: [{ filename: String, url: String }],
  isInternal: { type: Boolean, default: false }
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['hosting', 'app-development', 'workflow', 'billing', 'general', 'bug-report', 'feature-request'],
    default: 'general'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'in-progress', 'waiting-on-customer', 'resolved', 'closed'], default: 'open' },
  comments: [commentSchema],
  attachments: [{ filename: String, url: String }],
  relatedSite: { type: String },
  dueDate: { type: Date },
  resolvedAt: { type: Date },
  closedAt: { type: Date }
}, { timestamps: true });

ticketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `PW-${String(count + 1001).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
