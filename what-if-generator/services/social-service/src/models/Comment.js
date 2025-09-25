const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  postId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  parentCommentId: {
    type: String,
    index: true,
    default: null
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  images: [{
    url: String,
    caption: String,
    order: Number
  }],
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
  replies: {
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
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
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
commentSchema.index({ postId: 1, isDeleted: 1, createdAt: -1 });
commentSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1, isDeleted: 1, createdAt: -1 });

// Static methods
commentSchema.statics.findByPostId = function(postId, options = {}) {
  const query = { postId, isDeleted: false };
  
  if (options.parentCommentId !== undefined) {
    query.parentCommentId = options.parentCommentId;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

commentSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, isDeleted: false };
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

commentSchema.statics.findReplies = function(parentCommentId, options = {}) {
  const query = { parentCommentId, isDeleted: false };
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

// Instance methods
commentSchema.methods.like = async function(userId) {
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

commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.users.some(like => like.userId === userId);
};

commentSchema.methods.updateContent = async function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

commentSchema.methods.toPublicJSON = function() {
  return {
    commentId: this.commentId,
    postId: this.postId,
    userId: this.userId,
    parentCommentId: this.parentCommentId,
    content: this.content,
    images: this.images,
    likes: {
      count: this.likes.count
    },
    replies: {
      count: this.replies.count
    },
    isEdited: this.isEdited,
    editedAt: this.editedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Comment', commentSchema);