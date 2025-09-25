const User = require('../models/User');
const logger = require('../config/logger');

class ProfileController {
  // Get user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      logger.info('User profile retrieved', { userId });

      res.json({
        success: true,
        data: { user: user.toPublicJSON() }
      });
    } catch (error) {
      logger.error('Failed to get user profile', { 
        error: error.message, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      const allowedFields = [
        'displayName', 'bio', 'location', 'website', 'avatar',
        'socialLinks', 'preferences', 'isPublic'
      ];
      
      const filteredData = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user
      await user.update(filteredData);

      logger.info('User profile updated', { 
        userId, 
        updatedFields: Object.keys(filteredData) 
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: user.toPublicJSON() }
      });
    } catch (error) {
      logger.error('Failed to update user profile', { 
        error: error.message, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update user profile'
      });
    }
  }

  // Get user by username
  static async getUserByUsername(req, res) {
    try {
      const { username } = req.params;
      
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Only return public profile for other users
      const publicProfile = user.toPublicJSON();

      res.json({
        success: true,
        data: { user: publicProfile }
      });
    } catch (error) {
      logger.error('Failed to get user by username', { 
        error: error.message, 
        username: req.params.username 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }

  // Get user stats
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const stats = {
        followers: user.followers,
        following: user.following,
        reputation: user.reputation,
        level: user.level,
        experience: user.experience,
        posts: 0, // This would come from social service
        scenarios: 0, // This would come from history service
        achievements: 0 // This would come from social service
      };

      logger.info('User stats retrieved', { userId });

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Failed to get user stats', { 
        error: error.message, 
        userId: req.user.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get user stats'
      });
    }
  }

  // Update user stats (called by other services)
  static async updateStats(req, res) {
    try {
      const { userId } = req.params;
      const stats = req.body;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await user.updateSocialStats(stats);

      logger.info('User stats updated', { 
        userId, 
        stats: Object.keys(stats) 
      });

      res.json({
        success: true,
        message: 'Stats updated successfully',
        data: { user: user.toPublicJSON() }
      });
    } catch (error) {
      logger.error('Failed to update user stats', { 
        error: error.message, 
        userId: req.params.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update user stats'
      });
    }
  }

  // Get leaderboard
  static async getLeaderboard(req, res) {
    try {
      const { category = 'reputation', limit = 100 } = req.query;
      
      const users = await User.findTopUsers(parseInt(limit));

      logger.info('Leaderboard retrieved', { 
        category, 
        limit: parseInt(limit),
        count: users.length 
      });

      res.json({
        success: true,
        data: { 
          leaderboard: users.map(user => user.toPublicJSON()),
          category,
          total: users.length
        }
      });
    } catch (error) {
      logger.error('Failed to get leaderboard', { 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get leaderboard'
      });
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      // Simple search implementation - in production, use full-text search
      const users = await User.findAll({
        where: {
          isPublic: true,
          [require('sequelize').Op.or]: [
            { username: { [require('sequelize').Op.iLike]: `%${q}%` } },
            { displayName: { [require('sequelize').Op.iLike]: `%${q}%` } }
          ]
        },
        limit: parseInt(limit),
        order: [['reputation', 'DESC']]
      });

      logger.info('Users searched', { 
        query: q, 
        limit: parseInt(limit),
        count: users.length 
      });

      res.json({
        success: true,
        data: { 
          users: users.map(user => user.toPublicJSON()),
          query: q,
          total: users.length
        }
      });
    } catch (error) {
      logger.error('Failed to search users', { 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to search users'
      });
    }
  }

  // Follow/Unfollow user
  static async toggleFollow(req, res) {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user.id;
      
      if (currentUserId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot follow yourself'
        });
      }

      const currentUser = await User.findByPk(currentUserId);
      const targetUser = await User.findByPk(targetUserId);
      
      if (!currentUser || !targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Simple implementation - in production, use a separate Follows table
      // For now, we'll just update the counters
      const isFollowing = Math.random() > 0.5; // Placeholder logic
      
      if (isFollowing) {
        // Unfollow
        await currentUser.update({ following: Math.max(0, currentUser.following - 1) });
        await targetUser.update({ followers: Math.max(0, targetUser.followers - 1) });
      } else {
        // Follow
        await currentUser.update({ following: currentUser.following + 1 });
        await targetUser.update({ followers: targetUser.followers + 1 });
      }

      logger.info('Follow status toggled', { 
        currentUserId, 
        targetUserId, 
        action: isFollowing ? 'unfollow' : 'follow' 
      });

      res.json({
        success: true,
        message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
        data: { 
          isFollowing: !isFollowing,
          followers: targetUser.followers + (isFollowing ? -1 : 1)
        }
      });
    } catch (error) {
      logger.error('Failed to toggle follow', { 
        error: error.message, 
        currentUserId: req.user.id,
        targetUserId: req.params.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to toggle follow'
      });
    }
  }

  // Get user's followers/following
  static async getFollows(req, res) {
    try {
      const { userId } = req.params;
      const { type = 'followers', page = 1, limit = 20 } = req.query;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Simple implementation - in production, use a separate Follows table
      // For now, return mock data
      const mockUsers = Array.from({ length: Math.min(parseInt(limit), 10) }, (_, i) => ({
        id: `user_${i + 1}`,
        username: `user${i + 1}`,
        displayName: `User ${i + 1}`,
        avatar: null,
        isVerified: Math.random() > 0.8,
        stats: {
          followers: Math.floor(Math.random() * 1000),
          reputation: Math.floor(Math.random() * 500),
          level: Math.floor(Math.random() * 20) + 1
        }
      }));

      logger.info('Follows retrieved', { 
        userId, 
        type, 
        count: mockUsers.length 
      });

      res.json({
        success: true,
        data: { 
          users: mockUsers,
          type,
          total: user[type] || 0,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Failed to get follows', { 
        error: error.message, 
        userId: req.params.userId 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get follows'
      });
    }
  }
}

module.exports = ProfileController;