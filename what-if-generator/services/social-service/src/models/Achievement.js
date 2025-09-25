const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  achievementId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['creation', 'interaction', 'social', 'milestone', 'special'],
    index: true
  },
  icon: {
    type: String,
    required: true
  },
  badge: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true,
    min: 0,
    max: 1000
  },
  rarity: {
    type: String,
    required: true,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  requirements: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  unlockDate: {
    type: Date,
    default: null
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

// Static methods
achievementSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ points: -1 });
};

achievementSchema.statics.findByRarity = function(rarity) {
  return this.find({ rarity, isActive: true }).sort({ points: -1 });
};

achievementSchema.statics.findPublic = function() {
  return this.find({ isActive: true, isHidden: false }).sort({ points: -1 });
};

// Instance methods
achievementSchema.methods.toPublicJSON = function() {
  return {
    achievementId: this.achievementId,
    name: this.name,
    description: this.description,
    category: this.category,
    icon: this.icon,
    badge: this.badge,
    points: this.points,
    rarity: this.rarity,
    isHidden: this.isHidden
  };
};

module.exports = mongoose.model('Achievement', achievementSchema);