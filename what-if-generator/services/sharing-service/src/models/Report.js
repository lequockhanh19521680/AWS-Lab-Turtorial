const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // What is being reported
  targetType: {
    type: String,
    enum: ['scenario', 'shared_scenario'],
    required: true
  },
  
  targetId: {
    type: String,
    required: true,
    index: true
  },
  
  // Share URL if reporting a shared scenario
  shareUrl: {
    type: String,
    index: true,
    sparse: true
  },
  
  // Original scenario ID
  scenarioId: {
    type: String,
    required: true,
    index: true
  },
  
  // Reporter information
  reporterId: {
    type: String,
    default: null // null for anonymous reports
  },
  
  reporterIP: {
    type: String,
    required: true
  },
  
  reporterUserAgent: {
    type: String,
    default: null
  },
  
  // Report details
  reason: {
    type: String,
    enum: [
      'inappropriate_content',
      'spam',
      'harassment',
      'violence',
      'hate_speech',
      'adult_content',
      'misinformation',
      'copyright_violation',
      'other'
    ],
    required: true
  },
  
  description: {
    type: String,
    maxlength: 500,
    trim: true,
    default: null
  },
  
  // Additional context
  category: {
    type: String,
    enum: ['content', 'behavior', 'technical', 'legal'],
    default: 'content'
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Report status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed', 'escalated'],
    default: 'pending'
  },
  
  // Moderation information
  reviewedBy: {
    type: String,
    default: null
  },
  
  reviewedAt: {
    type: Date,
    default: null
  },
  
  moderatorNotes: {
    type: String,
    maxlength: 1000,
    default: null
  },
  
  // Actions taken
  actionTaken: {
    type: String,
    enum: [
      'none',
      'warning',
      'content_hidden',
      'content_removed',
      'user_warned',
      'user_suspended',
      'user_banned',
      'escalated_to_admin'
    ],
    default: 'none'
  },
  
  actionReason: {
    type: String,
    maxlength: 500,
    default: null
  },
  
  // Auto-moderation flags
  isAutoModerated: {
    type: Boolean,
    default: false
  },
  
  autoModerationScore: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  
  // Duplicate detection
  isDuplicate: {
    type: Boolean,
    default: false
  },
  
  originalReportId: {
    type: String,
    default: null
  },
  
  // Priority scoring
  priorityScore: {
    type: Number,
    default: 0
  },
  
  // Resolution details
  resolvedAt: {
    type: Date,
    default: null
  },
  
  resolution: {
    type: String,
    maxlength: 500,
    default: null
  },
  
  // Follow-up information
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  followUpDate: {
    type: Date,
    default: null
  },
  
  // Reporter feedback
  reporterNotified: {
    type: Boolean,
    default: false
  },
  
  reporterSatisfied: {
    type: Boolean,
    default: null
  }
}, {
  timestamps: true,
  collection: 'reports'
});

// Indexes
reportSchema.index({ targetId: 1, status: 1 });
reportSchema.index({ scenarioId: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ severity: 1, status: 1 });
reportSchema.index({ isAutoModerated: 1, status: 1 });
reportSchema.index({ followUpRequired: 1, followUpDate: 1 });

// Compound indexes
reportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 });
reportSchema.index({ reason: 1, status: 1, createdAt: -1 });

// Static methods
reportSchema.statics.findPendingReports = function(options = {}) {
  const query = { status: 'pending' };
  const sort = options.sort || { priorityScore: -1, createdAt: 1 };
  const limit = options.limit || 50;
  
  return this.find(query)
    .sort(sort)
    .limit(limit);
};

reportSchema.statics.findReportsByTarget = function(targetType, targetId) {
  return this.find({
    targetType,
    targetId,
    status: { $ne: 'dismissed' }
  }).sort({ createdAt: -1 });
};

reportSchema.statics.checkDuplicateReport = function(targetType, targetId, reporterId, reporterIP) {
  const query = {
    targetType,
    targetId,
    status: { $in: ['pending', 'under_review'] }
  };
  
  if (reporterId) {
    query.reporterId = reporterId;
  } else {
    query.reporterIP = reporterIP;
  }
  
  return this.findOne(query);
};

reportSchema.statics.getReportStats = function(dateFrom, dateTo) {
  const matchStage = {};
  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReports: { $sum: 1 },
        pendingReports: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolvedReports: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        dismissedReports: {
          $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
        },
        reportsByReason: {
          $push: '$reason'
        },
        reportsBySeverity: {
          $push: '$severity'
        }
      }
    }
  ]);
};

// Instance methods
reportSchema.methods.markAsReviewed = function(reviewerId, notes = null) {
  this.status = 'under_review';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  if (notes) {
    this.moderatorNotes = notes;
  }
  return this.save();
};

reportSchema.methods.resolve = function(action, reason = null, resolution = null) {
  this.status = 'resolved';
  this.actionTaken = action;
  this.actionReason = reason;
  this.resolution = resolution;
  this.resolvedAt = new Date();
  return this.save();
};

reportSchema.methods.dismiss = function(reason = null) {
  this.status = 'dismissed';
  this.resolution = reason;
  this.resolvedAt = new Date();
  return this.save();
};

// Calculate priority score based on severity, reason, and other factors
reportSchema.methods.calculatePriorityScore = function() {
  let score = 0;
  
  // Base score by severity
  switch (this.severity) {
    case 'critical': score += 100; break;
    case 'high': score += 75; break;
    case 'medium': score += 50; break;
    case 'low': score += 25; break;
  }
  
  // Boost score for certain reasons
  const highPriorityReasons = ['violence', 'hate_speech', 'harassment'];
  if (highPriorityReasons.includes(this.reason)) {
    score += 25;
  }
  
  // Auto-moderation boost
  if (this.isAutoModerated && this.autoModerationScore > 0.7) {
    score += 30;
  }
  
  this.priorityScore = score;
  return score;
};

// Pre-save middleware
reportSchema.pre('save', function(next) {
  // Calculate priority score if not set
  if (this.priorityScore === 0) {
    this.calculatePriorityScore();
  }
  
  next();
});

module.exports = mongoose.model('Report', reportSchema);