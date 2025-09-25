const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    maxlength: 30,
    minlength: 3,
    match: /^[a-zA-Z0-9_]+$/
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 50
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  avatar: {
    url: {
      type: String,
      default: null
    },
    thumbnail: {
      type: String,
      default: null
    }
  },
  coverImage: {
    url: {
      type: String,
      default: null
    }
  },
  location: {
    type: String,
    maxlength: 100,
    default: ''
  },
  website: {
    type: String,
    maxlength: 200,
    default: ''
  },
  birthDate: {
    type: Date,
    default: null
  },
  socialLinks: {
    twitter: {
      type: String,
      maxlength: 100,
      default: ''
    },
    instagram: {
      type: String,
      maxlength: 100,
      default: ''
    },
    facebook: {
      type: String,
      maxlength: 100,
      default: ''
    },
    linkedin: {
      type: String,
      maxlength: 100,
      default: ''
    }
  },
  stats: {
    followers: {
      type: Number,
      default: 0,
      min: 0
    },
    following: {
      type: Number,
      default: 0,
      min: 0
    },
    posts: {
      type: Number,
      default: 0,
      min: 0
    },
    scenarios: {
      type: Number,
      default: 0,
      min: 0
    },
    totalLikes: {
      type: Number,
      default: 0,
      min: 0
    },
    totalShares: {
      type: Number,
      default: 0,
      min: 0
    },
    totalComments: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 100
    },
    experience: {
      type: Number,
      default: 0,
      min: 0
    },
    reputation: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  preferences: {
    isPublic: {
      type: Boolean,
      default: true
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showBirthDate: {
      type: Boolean,
      default: false
    },
    allowMessages: {
      type: Boolean,
      default: true
    },
    notifications: {
      likes: {
        type: Boolean,
        default: true
      },
      comments: {
        type: Boolean,
        default: true
      },
      follows: {
        type: Boolean,
        default: true
      },
      achievements: {
        type: Boolean,
        default: true
      }
    }
  },
  badges: [{
    badgeId: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    isDisplayed: {
      type: Boolean,
      default: true
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
userProfileSchema.index({ username: 1 });
userProfileSchema.index({ 'stats.followers': -1 });
userProfileSchema.index({ 'stats.reputation': -1 });
userProfileSchema.index({ 'stats.level': -1 });
userProfileSchema.index({ lastActiveAt: -1 });

// Static methods
userProfileSchema.statics.findByUsername = function(username) {
  return this.findOne({ username, isBanned: false });
};

userProfileSchema.statics.findTopUsers = function(options = {}) {
  const sortField = options.sortBy || 'stats.reputation';
  const limit = options.limit || 50;
  
  return this.find({ isBanned: false })
    .sort({ [sortField]: -1 })
    .limit(limit);
};

userProfileSchema.statics.searchUsers = function(searchTerm, options = {}) {
  const query = {
    isBanned: false,
    $or: [
      { username: { $regex: searchTerm, $options: 'i' } },
      { displayName: { $regex: searchTerm, $options: 'i' } },
      { bio: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  return this.find(query)
    .sort(options.sort || { 'stats.reputation': -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

userProfileSchema.statics.getLeaderboard = function(category = 'reputation', options = {}) {
  const sortField = `stats.${category}`;
  const limit = options.limit || 100;
  
  return this.find({ isBanned: false })
    .sort({ [sortField]: -1 })
    .limit(limit);
};

// Instance methods
userProfileSchema.methods.incrementStat = async function(statName, increment = 1) {
  this.stats[statName] = (this.stats[statName] || 0) + increment;
  
  // Update level based on experience
  if (statName === 'experience') {
    const newLevel = Math.floor(this.stats.experience / 1000) + 1;
    if (newLevel > this.stats.level) {
      this.stats.level = Math.min(newLevel, 100);
    }
  }
  
  return this.save();
};

userProfileSchema.methods.decrementStat = async function(statName, decrement = 1) {
  this.stats[statName] = Math.max(0, (this.stats[statName] || 0) - decrement);
  return this.save();
};

userProfileSchema.methods.addBadge = async function(badgeId) {
  const existingBadge = this.badges.find(badge => badge.badgeId === badgeId);
  
  if (!existingBadge) {
    this.badges.push({
      badgeId,
      earnedAt: new Date(),
      isDisplayed: true
    });
    
    // Update reputation
    await this.incrementStat('reputation', 10);
  }
  
  return this.save();
};

userProfileSchema.methods.updateLastActive = async function() {
  this.lastActiveAt = new Date();
  return this.save();
};

userProfileSchema.methods.toPublicJSON = function() {
  return {
    userId: this.userId,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    avatar: this.avatar,
    coverImage: this.coverImage,
    location: this.location,
    website: this.website,
    socialLinks: this.socialLinks,
    stats: {
      followers: this.stats.followers,
      following: this.stats.following,
      posts: this.stats.posts,
      scenarios: this.stats.scenarios,
      totalLikes: this.stats.totalLikes,
      level: this.stats.level,
      reputation: this.stats.reputation
    },
    badges: this.badges.filter(badge => badge.isDisplayed),
    isVerified: this.isVerified,
    lastActiveAt: this.lastActiveAt,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('UserProfile', userProfileSchema);