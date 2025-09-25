const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  postId: {
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
  scenarioId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['achievement', 'scenario', 'milestone', 'custom'],
    default: 'custom'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  images: [{
    url: String,
    caption: String,
    order: Number
  }],
  tags: [{
    type: String,
    maxlength: 30
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  likes: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    users: [{
      userId: String,
      likedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  shares: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    users: [{
      userId: String,
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  comments: {
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
postSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ visibility: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ tags: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ 'likes.count': -1, createdAt: -1 });
postSchema.index({ 'shares.count': -1, createdAt: -1 });

// Static methods
postSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, isDeleted: false };
  
  if (options.visibility) {
    query.visibility = options.visibility;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

postSchema.statics.findPublicFeed = function(options = {}) {
  const query = { 
    visibility: 'public', 
    isDeleted: false 
  };
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

postSchema.statics.findTrending = function(options = {}) {
  const query = { 
    visibility: 'public', 
    isDeleted: false,
    createdAt: {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  };
  
  return this.find(query)
    .sort({ 'likes.count': -1, 'shares.count': -1, createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

postSchema.statics.searchPosts = function(searchTerm, options = {}) {
  const query = {
    visibility: 'public',
    isDeleted: false,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

// Instance methods
postSchema.methods.like = async function(userId) {
  const existingLike = this.likes.users.find(like => like.userId === userId);
  
  if (existingLike) {
    // Unlike
    this.likes.users = this.likes.users.filter(like => like.userId !== userId);
    this.likes.count = Math.max(0, this.likes.count - 1);
  } else {
    // Like
    this.likes.users.push({ userId, likedAt: new Date() });
    this.likes.count += 1;
  }
  
  return this.save();
};

postSchema.methods.share = async function(userId) {
  const existingShare = this.shares.users.find(share => share.userId === userId);
  
  if (!existingShare) {
    this.shares.users.push({ userId, sharedAt: new Date() });
    this.shares.count += 1;
  }
  
  return this.save();
};

postSchema.methods.isLikedBy = function(userId) {
  return this.likes.users.some(like => like.userId === userId);
};

postSchema.methods.isSharedBy = function(userId) {
  return this.shares.users.some(share => share.userId === userId);
};

postSchema.methods.toPublicJSON = function() {
  return {
    postId: this.postId,
    userId: this.userId,
    scenarioId: this.scenarioId,
    type: this.type,
    title: this.title,
    content: this.content,
    images: this.images,
    tags: this.tags,
    visibility: this.visibility,
    likes: {
      count: this.likes.count
    },
    shares: {
      count: this.shares.count
    },
    comments: {
      count: this.comments.count
    },
    isPinned: this.isPinned,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Post', postSchema);