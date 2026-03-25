const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  subject: { type: String, default: 'General Enquiry' },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  reply: { type: String, default: '' },
  repliedAt: { type: Date, default: null }
}, { timestamps: true });

contactMessageSchema.index({ userId: 1, isRead: 1 });
contactMessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
