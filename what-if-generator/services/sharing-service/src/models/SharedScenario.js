const mongoose = require('mongoose');

const sharedScenarioSchema = new mongoose.Schema({
  // Original scenario reference
  scenarioId: {
    type: String,
    required: true,
    index: true
  },
  
  // User who shared this scenario
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Unique share URL identifier
  shareUrl: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Short URL for easier sharing
  shortUrl: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Cached scenario data for faster access
  scenarioData: {
    topic: { type: String, required: true },
    content: { type: String, required: true },
    promptType: { type: String, default: 'default' },
    tags: [String],
    generatedAt: Date
  },
  
  // Sharing settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Privacy settings
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  
  password: {
    type: String,
    default: null
  },
  
  // Expiration settings
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Share metadata
  title: {
    type: String,
    maxlength: 100,
    default: null
  },
  
  description: {
    type: String,
    maxlength: 300,
    default: null
  },
  
  // Social media preview image
  previewImage: {
    type: String,
    default: null
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  
  shareCount: {
    type: Number,
    default: 0
  },
  
  // Share statistics by platform
  sharesByPlatform: {
    facebook: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    linkedin: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
    telegram: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
    copy: { type: Number, default: 0 },
    qr: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Geographic analytics
  viewsByCountry: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  
  // Device analytics
  viewsByDevice: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  
  // Referrer tracking
  referrers: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  
  // First and last access times
  firstAccessAt: {
    type: Date,
    default: null
  },
  
  lastAccessAt: {
    type: Date,
    default: null
  },
  
  // Report status
  reportCount: {
    type: Number,
    default: 0
  },
  
  isReported: {
    type: Boolean,
    default: false
  },
  
  isHidden: {
    type: Boolean,
    default: false
  },
  
  hiddenAt: {
    type: Date,
    default: null
  },
  
  hiddenReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'shared_scenarios'
});

// Indexes
sharedScenarioSchema.index({ userId: 1, createdAt: -1 });
sharedScenarioSchema.index({ scenarioId: 1 });
sharedScenarioSchema.index({ isActive: 1, isHidden: 1 });
sharedScenarioSchema.index({ expiresAt: 1 });

// TTL index for expired shares
sharedScenarioSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for full share URL
sharedScenarioSchema.virtual('fullShareUrl').get(function() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3005'}/shared/${this.shareUrl}`;
});

// Virtual for QR code URL
sharedScenarioSchema.virtual('qrCodeUrl').get(function() {
  return `${process.env.FRONTEND_URL || 'http://localhost:3005'}/api/sharing/qr/${this.shareUrl}`;
});

// Check if share is accessible
sharedScenarioSchema.methods.isAccessible = function() {
  if (!this.isActive || this.isHidden) {
    return false;
  }
  
  if (this.expiresAt && this.expiresAt < new Date()) {
    return false;
  }
  
  return true;
};

// Increment view count
sharedScenarioSchema.methods.incrementView = async function(metadata = {}) {
  this.viewCount += 1;
  this.lastAccessAt = new Date();
  
  if (!this.firstAccessAt) {
    this.firstAccessAt = new Date();
  }
  
  // Update device analytics
  if (metadata.device) {
    this.viewsByDevice[metadata.device] = (this.viewsByDevice[metadata.device] || 0) + 1;
  }
  
  // Update country analytics
  if (metadata.country) {
    const countryCount = this.viewsByCountry.get(metadata.country) || 0;
    this.viewsByCountry.set(metadata.country, countryCount + 1);
  }
  
  // Update referrer analytics
  if (metadata.referrer) {
    const referrerCount = this.referrers.get(metadata.referrer) || 0;
    this.referrers.set(metadata.referrer, referrerCount + 1);
  }
  
  return this.save();
};

// Increment share count
sharedScenarioSchema.methods.incrementShare = async function(platform = 'other') {
  this.shareCount += 1;
  
  if (this.sharesByPlatform[platform] !== undefined) {
    this.sharesByPlatform[platform] += 1;
  } else {
    this.sharesByPlatform.other += 1;
  }
  
  return this.save();
};

// Static methods
sharedScenarioSchema.statics.findByShareUrl = function(shareUrl) {
  return this.findOne({
    shareUrl,
    isActive: true,
    isHidden: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

sharedScenarioSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId };
  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 20;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Pre-save middleware
sharedScenarioSchema.pre('save', function(next) {
  // Auto-hide if report threshold exceeded
  const threshold = parseInt(process.env.REPORT_THRESHOLD_FOR_HIDE) || 5;
  if (this.reportCount >= threshold && !this.isHidden) {
    this.isHidden = true;
    this.hiddenAt = new Date();
    this.hiddenReason = 'Exceeded report threshold';
  }
  
  next();
});

module.exports = mongoose.model('SharedScenario', sharedScenarioSchema);