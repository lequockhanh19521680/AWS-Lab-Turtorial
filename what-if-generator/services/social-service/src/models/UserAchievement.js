const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  userAchievementId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  achievementId: {
    type: String,
    required: true,
    index: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ userId: 1, isCompleted: 1 });
userAchievementSchema.index({ unlockedAt: -1 });

// Static methods
userAchievementSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId };
  if (options.completed !== undefined) {
    query.isCompleted = options.completed;
  }
  
  return this.find(query)
    .sort(options.sort || { unlockedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

userAchievementSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalAchievements: { $sum: 1 },
        completedAchievements: { $sum: { $cond: ['$isCompleted', 1, 0] } },
        totalPoints: { $sum: { $cond: ['$isCompleted', '$points', 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    totalAchievements: 0,
    completedAchievements: 0,
    totalPoints: 0
  };
};

userAchievementSchema.statics.getLeaderboard = function(options = {}) {
  const pipeline = [
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: { $cond: ['$isCompleted', '$points', 0] } },
        completedCount: { $sum: { $cond: ['$isCompleted', 1, 0] } }
      }
    },
    {
      $sort: { totalPoints: -1 }
    },
    {
      $limit: options.limit || 100
    }
  ];
  
  return this.aggregate(pipeline);
};

// Instance methods
userAchievementSchema.methods.updateProgress = async function(newProgress) {
  this.progress = Math.min(Math.max(newProgress, 0), 100);
  
  if (this.progress >= 100 && !this.isCompleted) {
    this.isCompleted = true;
    this.unlockedAt = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('UserAchievement', userAchievementSchema);