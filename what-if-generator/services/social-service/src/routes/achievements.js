const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const UserProfile = require('../models/UserProfile');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const { 
  validateCreateAchievement, 
  validateObjectId, 
  validatePagination 
} = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

// Create achievement (Admin only)
router.post('/', authMiddleware, requireAdmin, validateCreateAchievement, async (req, res) => {
  try {
    const { name, description, category, icon, badge, points, rarity, requirements, isHidden } = req.body;
    
    const achievement = new Achievement({
      achievementId: uuidv4(),
      name,
      description,
      category,
      icon,
      badge,
      points,
      rarity,
      requirements,
      isHidden: isHidden || false
    });

    await achievement.save();

    logger.info('Achievement created', { 
      achievementId: achievement.achievementId,
      name: achievement.name,
      createdBy: req.user.id 
    });

    res.status(201).json({
      success: true,
      data: { achievement: achievement.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to create achievement', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create achievement'
    });
  }
});

// Get all achievements
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, rarity } = req.query;
    const skip = (page - 1) * limit;
    
    let achievements;
    
    if (category) {
      achievements = await Achievement.findByCategory(category);
    } else if (rarity) {
      achievements = await Achievement.findByRarity(rarity);
    } else {
      achievements = await Achievement.findPublic();
    }

    // Apply pagination
    const paginatedAchievements = achievements.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: { 
        achievements: paginatedAchievements.map(achievement => achievement.toPublicJSON()),
        total: achievements.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Failed to get achievements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get achievements'
    });
  }
});

// Get achievement by ID
router.get('/:achievementId', validateObjectId('achievementId'), async (req, res) => {
  try {
    const { achievementId } = req.params;
    
    const achievement = await Achievement.findOne({ achievementId });
    
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      data: { achievement: achievement.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to get achievement', { 
      error: error.message, 
      achievementId: req.params.achievementId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get achievement'
    });
  }
});

// Get user's achievements
router.get('/user/:userId', authMiddleware, validateObjectId('userId'), validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, completed } = req.query;
    const skip = (page - 1) * limit;
    
    // Check if user is accessing their own achievements or has permission
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const options = { limit: parseInt(limit), skip };
    if (completed !== undefined) {
      options.completed = completed === 'true';
    }
    
    const userAchievements = await UserAchievement.findByUserId(userId, options);
    
    // Get achievement details
    const achievementIds = userAchievements.map(ua => ua.achievementId);
    const achievements = await Achievement.find({ achievementId: { $in: achievementIds } });
    
    const achievementMap = {};
    achievements.forEach(achievement => {
      achievementMap[achievement.achievementId] = achievement;
    });
    
    const result = userAchievements.map(userAchievement => {
      const achievement = achievementMap[userAchievement.achievementId];
      return {
        userAchievementId: userAchievement.userAchievementId,
        achievement: achievement ? achievement.toPublicJSON() : null,
        progress: userAchievement.progress,
        isCompleted: userAchievement.isCompleted,
        unlockedAt: userAchievement.unlockedAt,
        metadata: userAchievement.metadata
      };
    });

    res.json({
      success: true,
      data: { userAchievements: result }
    });
  } catch (error) {
    logger.error('Failed to get user achievements', { 
      error: error.message, 
      userId: req.params.userId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user achievements'
    });
  }
});

// Get user achievement stats
router.get('/user/:userId/stats', authMiddleware, validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is accessing their own stats or has permission
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const stats = await UserAchievement.getUserStats(userId);
    
    // Get user profile for additional stats
    const userProfile = await UserProfile.findOne({ userId });
    
    res.json({
      success: true,
      data: { 
        stats: {
          ...stats,
          level: userProfile?.stats?.level || 1,
          experience: userProfile?.stats?.experience || 0,
          reputation: userProfile?.stats?.reputation || 0
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get user achievement stats', { 
      error: error.message, 
      userId: req.params.userId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user achievement stats'
    });
  }
});

// Get achievement leaderboard
router.get('/leaderboard/top', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    
    const leaderboard = await UserAchievement.getLeaderboard({ limit: parseInt(limit) });
    
    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedLeaderboard = leaderboard.slice(skip, skip + parseInt(limit));
    
    res.json({
      success: true,
      data: { 
        leaderboard: paginatedLeaderboard,
        total: leaderboard.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Failed to get achievement leaderboard', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get achievement leaderboard'
    });
  }
});

// Award achievement to user (Admin only)
router.post('/:achievementId/award/:userId', authMiddleware, requireAdmin, 
  validateObjectId('achievementId'), validateObjectId('userId'), async (req, res) => {
  try {
    const { achievementId, userId } = req.params;
    
    // Check if achievement exists
    const achievement = await Achievement.findOne({ achievementId });
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }
    
    // Check if user already has this achievement
    const existingUserAchievement = await UserAchievement.findOne({ 
      userId, 
      achievementId 
    });
    
    if (existingUserAchievement) {
      return res.status(400).json({
        success: false,
        message: 'User already has this achievement'
      });
    }
    
    // Create user achievement
    const userAchievement = new UserAchievement({
      userAchievementId: uuidv4(),
      userId,
      achievementId,
      progress: 100,
      isCompleted: true,
      unlockedAt: new Date()
    });
    
    await userAchievement.save();
    
    // Update user profile
    await UserProfile.findOneAndUpdate(
      { userId },
      { 
        $inc: { 
          'stats.experience': achievement.points,
          'stats.reputation': achievement.points
        },
        $push: {
          badges: {
            badgeId: achievement.achievementId,
            earnedAt: new Date(),
            isDisplayed: true
          }
        }
      },
      { upsert: true }
    );

    logger.info('Achievement awarded', { 
      achievementId,
      userId,
      awardedBy: req.user.id 
    });

    res.json({
      success: true,
      message: 'Achievement awarded successfully',
      data: { userAchievement }
    });
  } catch (error) {
    logger.error('Failed to award achievement', { 
      error: error.message, 
      achievementId: req.params.achievementId,
      userId: req.params.userId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to award achievement'
    });
  }
});

// Update achievement progress
router.put('/:achievementId/progress', authMiddleware, validateObjectId('achievementId'), async (req, res) => {
  try {
    const { achievementId } = req.params;
    const { progress, metadata } = req.body;
    
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be a number between 0 and 100'
      });
    }
    
    // Find or create user achievement
    let userAchievement = await UserAchievement.findOne({ 
      userId: req.user.id, 
      achievementId 
    });
    
    if (!userAchievement) {
      userAchievement = new UserAchievement({
        userAchievementId: uuidv4(),
        userId: req.user.id,
        achievementId,
        progress,
        metadata: metadata || {}
      });
    } else {
      userAchievement.progress = progress;
      if (metadata) {
        userAchievement.metadata = { ...userAchievement.metadata, ...metadata };
      }
    }
    
    await userAchievement.save();
    
    // If achievement is completed, update user profile
    if (userAchievement.isCompleted && progress >= 100) {
      const achievement = await Achievement.findOne({ achievementId });
      if (achievement) {
        await UserProfile.findOneAndUpdate(
          { userId: req.user.id },
          { 
            $inc: { 
              'stats.experience': achievement.points,
              'stats.reputation': achievement.points
            },
            $push: {
              badges: {
                badgeId: achievement.achievementId,
                earnedAt: new Date(),
                isDisplayed: true
              }
            }
          },
          { upsert: true }
        );
      }
    }

    logger.info('Achievement progress updated', { 
      achievementId,
      userId: req.user.id,
      progress 
    });

    res.json({
      success: true,
      data: { userAchievement }
    });
  } catch (error) {
    logger.error('Failed to update achievement progress', { 
      error: error.message, 
      achievementId: req.params.achievementId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update achievement progress'
    });
  }
});

module.exports = router;