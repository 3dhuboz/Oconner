const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  client: { type: String, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['web-hosting', 'app-development', 'workflow-solutions', 'website-design'],
    required: true
  },
  technologies: [{ type: String }],
  images: [{ url: String, caption: String }],
  liveUrl: { type: String },
  appUrl: { type: String, default: '' },
  appLogoUrl: { type: String, default: '' },
  testimonial: { quote: String, author: String, role: String },
  isFeatured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  completedDate: { type: Date },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
