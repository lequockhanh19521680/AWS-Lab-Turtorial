const mongoose = require('mongoose');

const scenarioAnalyticsSchema = new mongoose.Schema({
  // Reference to the scenario
  scenarioId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Daily analytics data
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // View statistics
  views: {
    type: Number,
    default: 0
  },
  
  uniqueViews: {
    type: Number,
    default: 0
  },
  
  // Share statistics
  shares: {
    type: Number,
    default: 0
  },
  
  sharesByPlatform: {
    facebook: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    linkedin: { type: Number, default: 0 },
    copy: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Rating statistics
  ratings: [{
    rating: { type: Number, min: 1, max: 5 },
    timestamp: { type: Date, default: Date.now }
  }],
  
  averageRating: {
    type: Number,
    default: 0
  },
  
  // Geographic data (if available)
  viewsByCountry: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  
  // Device/platform statistics
  viewsByDevice: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  
  // Referrer statistics
  referrers: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  
  // Time spent reading (in seconds)
  timeSpent: {
    total: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'scenario_analytics'
});

// Compound indexes
scenarioAnalyticsSchema.index({ scenarioId: 1, date: -1 });
scenarioAnalyticsSchema.index({ userId: 1, date: -1 });
scenarioAnalyticsSchema.index({ date: -1 });

// Statics for aggregating data
scenarioAnalyticsSchema.statics.getScenarioStats = function(scenarioId, startDate, endDate) {
  const matchStage = {
    scenarioId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$scenarioId',
        totalViews: { $sum: '$views' },
        totalUniqueViews: { $sum: '$uniqueViews' },
        totalShares: { $sum: '$shares' },
        averageRating: { $avg: '$averageRating' },
        totalRatings: { $sum: { $size: '$ratings' } }
      }
    }
  ]);
};

scenarioAnalyticsSchema.statics.getUserStats = function(userId, startDate, endDate) {
  const matchStage = {
    userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$userId',
        totalScenarios: { $addToSet: '$scenarioId' },
        totalViews: { $sum: '$views' },
        totalShares: { $sum: '$shares' },
        averageRating: { $avg: '$averageRating' }
      }
    },
    {
      $project: {
        totalScenarios: { $size: '$totalScenarios' },
        totalViews: 1,
        totalShares: 1,
        averageRating: 1
      }
    }
  ]);
};

module.exports = mongoose.model('ScenarioAnalytics', scenarioAnalyticsSchema);