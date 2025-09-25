const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const UserProfile = require('../models/UserProfile');
const logger = require('../config/logger');

const router = express.Router();

// Get user's liked posts
router.get('/likes/posts', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const posts = await Post.find({
      'likes.users.userId': req.user.id,
      isDeleted: false
    })
    .sort({ 'likes.users.likedAt': -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const result = posts.map(post => {
      const postObj = post.toPublicJSON();
      postObj.userInteractions = {
        isLiked: true,
        isShared: post.isSharedBy(req.user.id)
      };
      return postObj;
    });

    res.json({
      success: true,
      data: { posts: result }
    });
  } catch (error) {
    logger.error('Failed to get liked posts', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get liked posts'
    });
  }
});

// Get user's shared posts
router.get('/shares/posts', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const posts = await Post.find({
      'shares.users.userId': req.user.id,
      isDeleted: false
    })
    .sort({ 'shares.users.sharedAt': -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const result = posts.map(post => {
      const postObj = post.toPublicJSON();
      postObj.userInteractions = {
        isLiked: post.isLikedBy(req.user.id),
        isShared: true
      };
      return postObj;
    });

    res.json({
      success: true,
      data: { posts: result }
    });
  } catch (error) {
    logger.error('Failed to get shared posts', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get shared posts'
    });
  }
});

// Get user's liked comments
router.get('/likes/comments', authMiddleware, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const comments = await Comment.find({
      'likes.users.userId': req.user.id,
      isDeleted: false
    })
    .sort({ 'likes.users.likedAt': -1 })
    .limit(parseInt(limit))
    .skip(skip);

    res.json({
      success: true,
      data: { comments: comments.map(comment => comment.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get liked comments', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get liked comments'
    });
  }
});

// Get user interaction stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userProfile = await UserProfile.findOne({ userId: req.user.id });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalLikes: userProfile.stats.totalLikes,
          totalShares: userProfile.stats.totalShares,
          totalComments: userProfile.stats.totalComments,
          totalPosts: userProfile.stats.posts,
          followers: userProfile.stats.followers,
          following: userProfile.stats.following,
          reputation: userProfile.stats.reputation,
          level: userProfile.stats.level,
          experience: userProfile.stats.experience
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get interaction stats', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get interaction stats'
    });
  }
});

module.exports = router;