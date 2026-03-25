const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  actor: { type: String, default: '' },
  targetModel: { type: String, default: '' },
  targetId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: { type: String, default: '' }
}, { timestamps: true });

auditLogSchema.index({ owner: 1, createdAt: -1 });
auditLogSchema.index({ owner: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
