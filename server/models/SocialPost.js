const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['Facebook', 'Instagram', 'TikTok', 'LinkedIn'], required: true },
  content: { type: String, required: true },
  hashtags: [{ type: String }],
  scheduledFor: { type: Date, required: true },
  status: { type: String, enum: ['Draft', 'Scheduled', 'Posted'], default: 'Draft' },
  image: { type: String },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  imagePrompt: { type: String },
  reasoning: { type: String },
  pillar: { type: String },
  topic: { type: String },
  publishedAt: { type: Date },
  publishError: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SocialPost', socialPostSchema);
