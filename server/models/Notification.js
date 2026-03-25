const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['email', 'push', 'sms'], default: 'email' },
  recipient: { type: String, required: true },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
  sentAt: Date,
  error: { type: String, default: '' },
  relatedModel: { type: String, default: '' },
  relatedId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

notificationSchema.index({ owner: 1, createdAt: -1 });
notificationSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
