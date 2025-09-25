const mongoose = require('mongoose');

const tokenUsageSchema = new mongoose.Schema({
  prompt: {
    type: Number,
    default: 0
  },
  completion: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  }
}, { _id: false });

const scenarioSchema = new mongoose.Schema({
  // Unique scenario identifier from generation service
  scenarioId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User who created this scenario
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // The topic used to generate the scenario
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // The generated scenario content
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  
  // Type of prompt used
  promptType: {
    type: String,
    enum: ['default', 'historical', 'scientific', 'social', 'fantasy'],
    default: 'default'
  },
  
  // AI provider information
  provider: {
    type: String,
    default: 'gemini'
  },
  
  model: {
    type: String,
    default: 'gemini-pro'
  },
  
  // Token usage for analytics
  tokens: {
    type: tokenUsageSchema,
    default: () => ({})
  },
  
  // UC-007: Tags for categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  
  // UC-006: Sharing settings
  isPublic: {
    type: Boolean,
    default: false
  },
  
  shareUrl: {
    type: String,
    unique: true,
    sparse: true // Allow null values to be unique
  },
  
  // Favorites and ratings
  isFavorite: {
    type: Boolean,
    default: false
  },
  
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // Analytics and metadata
  viewCount: {
    type: Number,
    default: 0
  },
  
  shareCount: {
    type: Number,
    default: 0
  },
  
  // If this is a regeneration of another scenario
  previousScenarioId: {
    type: String,
    default: null
  },
  
  // Generation metadata
  generatedAt: {
    type: Date,
    required: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'scenarios'
});

// Indexes for better query performance
scenarioSchema.index({ userId: 1, createdAt: -1 });
scenarioSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
scenarioSchema.index({ tags: 1 });
scenarioSchema.index({ isPublic: 1, createdAt: -1 });
scenarioSchema.index({ topic: 'text', content: 'text' });
scenarioSchema.index({ 'tags': 'text' });

// Compound indexes for common queries
scenarioSchema.index({ userId: 1, isFavorite: 1, isDeleted: 1 });
scenarioSchema.index({ userId: 1, promptType: 1, isDeleted: 1 });

// Virtual for public URL
scenarioSchema.virtual('publicUrl').get(function() {
  if (this.isPublic && this.shareUrl) {
    return `${process.env.FRONTEND_URL || 'http://localhost:3005'}/shared/${this.shareUrl}`;
  }
  return null;
});

// Methods
scenarioSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.userId;
  delete obj.__v;
  return obj;
};

// Statics
scenarioSchema.statics.findByUserId = function(userId, options = {}) {
  const query = {
    userId,
    isDeleted: false,
    ...options.filter
  };
  
  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 20;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

scenarioSchema.statics.searchByUser = function(userId, searchTerm, options = {}) {
  const query = {
    userId,
    isDeleted: false,
    $or: [
      { topic: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  
  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 20;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

scenarioSchema.statics.getPublicScenarios = function(options = {}) {
  const query = {
    isPublic: true,
    isDeleted: false
  };
  
  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 20;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Pre-save middleware
scenarioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-findOneAndUpdate middleware
scenarioSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Scenario', scenarioSchema);