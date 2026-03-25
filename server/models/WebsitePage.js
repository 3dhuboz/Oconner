const mongoose = require('mongoose');

const websitePageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  heroImage: { type: String, default: '' },
  heroTitle: { type: String, default: '' },
  heroSubtitle: { type: String, default: '' },
  sections: [{
    type: { type: String, enum: ['text', 'image', 'gallery', 'cta', 'faq', 'testimonial'], default: 'text' },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    order: { type: Number, default: 0 }
  }],
  isPublished: { type: Boolean, default: true },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' }
}, { timestamps: true });

websitePageSchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('WebsitePage', websitePageSchema);
