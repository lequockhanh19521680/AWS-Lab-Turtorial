const express = require('express');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { validatePagination, validateSearch } = require('../middleware/validation');
const Post = require('../models/Post');
const UserProfile = require('../models/UserProfile');
const logger = require('../config/logger');

const router = express.Router();

// Get trending posts
router.get('/trending', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, timeframe = '7d' } = req.query;
    const skip = (page - 1) * limit;
    
    // Calculate date range based on timeframe
    let dateRange;
    switch (timeframe) {
      case '1d':
        dateRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    
    const posts = await Post.find({
      visibility: 'public',
      isDeleted: false,
      createdAt: { $gte: dateRange }
    })
    .sort({ 'likes.count': -1, 'shares.count': -1, createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    res.json({
      success: true,
      data: { posts: posts.map(post => post.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get trending posts', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get trending posts'
    });
  }
});

// Get latest posts
router.get('/latest', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const posts = await Post.find({
      visibility: 'public',
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    res.json({
      success: true,
      data: { posts: posts.map(post => post.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get latest posts', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get latest posts'
    });
  }
});

// Get popular users
router.get('/users/popular', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'reputation' } = req.query;
    const skip = (page - 1) * limit;
    
    const users = await UserProfile.findTopUsers({ 
      limit: parseInt(limit), 
      skip,
      sortBy: `stats.${sortBy}` 
    });

    res.json({
      success: true,
      data: { users: users.map(user => user.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get popular users', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get popular users'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 100, category = 'reputation' } = req.query;
    const skip = (page - 1) * limit;
    
    const leaderboard = await UserProfile.getLeaderboard(category, { 
      limit: parseInt(limit), 
      skip 
    });

    res.json({
      success: true,
      data: { 
        leaderboard: leaderboard.map(user => user.toPublicJSON()),
        category 
      }
    });
  } catch (error) {
    logger.error('Failed to get leaderboard', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard'
    });
  }
});

// Search users
router.get('/users/search', validateSearch, validatePagination, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const users = await UserProfile.searchUsers(q, { 
      limit: parseInt(limit), 
      skip 
    });

    res.json({
      success: true,
      data: { users: users.map(user => user.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to search users', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
});

// Get user profile
router.get('/users/:userId', validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userProfile = await UserProfile.findOne({ userId, isBanned: false });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: { user: userProfile.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to get user profile', { 
      error: error.message, 
      userId: req.params.userId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// Get user profile by username
router.get('/users/username/:username', validatePagination, async (req, res) => {
  try {
    const { username } = req.params;
    
    const userProfile = await UserProfile.findByUsername(username);
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      data: { user: userProfile.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to get user profile by username', { 
      error: error.message, 
      username: req.params.username 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

module.exports = router;