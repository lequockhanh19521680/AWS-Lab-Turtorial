const Scenario = require('../models/Scenario');
const ScenarioAnalytics = require('../models/ScenarioAnalytics');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class ScenarioController {
  /**
   * Create new scenario (called from generation service)
   */
  async createScenario(req, res) {
    try {
      const scenarioData = req.body;
      
      logger.info('Creating new scenario', {
        scenarioId: scenarioData.scenarioId,
        userId: scenarioData.userId,
        topic: scenarioData.topic
      });

      // Check if scenario already exists
      const existingScenario = await Scenario.findOne({
        scenarioId: scenarioData.scenarioId
      });

      if (existingScenario) {
        return res.status(409).json({
          success: false,
          message: 'Scenario already exists'
        });
      }

      const scenario = new Scenario(scenarioData);
      await scenario.save();

      logger.info('Scenario created successfully', {
        scenarioId: scenario.scenarioId,
        userId: scenario.userId
      });

      res.status(201).json({
        success: true,
        message: 'Scenario created successfully',
        data: { scenario }
      });

    } catch (error) {
      logger.error('Error creating scenario', {
        error: error.message,
        scenarioData: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create scenario'
      });
    }
  }

  /**
   * UC-004: Get user's scenario history
   */
  async getUserScenarios(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        promptType,
        isFavorite,
        tags
      } = req.query;

      logger.info('Getting user scenarios', {
        userId,
        page,
        limit,
        sort,
        order
      });

      // Build filter
      const filter = { isDeleted: false };
      if (promptType) filter.promptType = promptType;
      if (isFavorite !== undefined) filter.isFavorite = isFavorite === 'true';
      if (tags) {
        const tagsArray = tags.split(',').map(tag => tag.trim());
        filter.tags = { $in: tagsArray };
      }

      const sortObj = { [sort]: order === 'desc' ? -1 : 1 };
      const skip = (page - 1) * limit;

      const [scenarios, total] = await Promise.all([
        Scenario.findByUserId(userId, {
          filter,
          sort: sortObj,
          limit: parseInt(limit),
          skip
        }),
        Scenario.countDocuments({ userId, isDeleted: false, ...filter })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          scenarios,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error getting user scenarios', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get scenarios'
      });
    }
  }

  /**
   * Get single scenario by ID
   */
  async getScenarioById(req, res) {
    try {
      const { scenarioId } = req.params;
      const userId = req.user?.id;

      const scenario = await Scenario.findOne({
        scenarioId,
        isDeleted: false
      });

      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: 'Scenario not found'
        });
      }

      // Check permissions
      if (scenario.userId !== userId && !scenario.isPublic) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Increment view count if viewing own scenario or public scenario
      if (scenario.isPublic || scenario.userId === userId) {
        scenario.viewCount += 1;
        await scenario.save();

        // Record analytics
        if (process.env.ENABLE_ANALYTICS === 'true') {
          await this.recordAnalyticsEvent(scenarioId, 'view', {
            userId: userId || 'anonymous'
          });
        }
      }

      res.json({
        success: true,
        data: { scenario }
      });

    } catch (error) {
      logger.error('Error getting scenario by ID', {
        error: error.message,
        scenarioId: req.params.scenarioId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get scenario'
      });
    }
  }

  /**
   * UC-007: Update scenario (add tags, favorite, etc.)
   */
  async updateScenario(req, res) {
    try {
      const { scenarioId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      logger.info('Updating scenario', {
        scenarioId,
        userId,
        updateData
      });

      const scenario = await Scenario.findOne({
        scenarioId,
        userId,
        isDeleted: false
      });

      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: 'Scenario not found'
        });
      }

      // Generate share URL if making public
      if (updateData.isPublic && !scenario.shareUrl) {
        updateData.shareUrl = uuidv4();
      } else if (updateData.isPublic === false) {
        updateData.shareUrl = null;
      }

      Object.assign(scenario, updateData);
      await scenario.save();

      logger.info('Scenario updated successfully', {
        scenarioId,
        userId
      });

      res.json({
        success: true,
        message: 'Scenario updated successfully',
        data: { scenario }
      });

    } catch (error) {
      logger.error('Error updating scenario', {
        error: error.message,
        scenarioId: req.params.scenarioId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update scenario'
      });
    }
  }

  /**
   * UC-009: Delete scenario from history
   */
  async deleteScenario(req, res) {
    try {
      const { scenarioId } = req.params;
      const userId = req.user.id;

      logger.info('Deleting scenario', {
        scenarioId,
        userId
      });

      const scenario = await Scenario.findOne({
        scenarioId,
        userId,
        isDeleted: false
      });

      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: 'Scenario not found'
        });
      }

      // Soft delete
      scenario.isDeleted = true;
      scenario.deletedAt = new Date();
      scenario.isPublic = false; // Remove from public if it was public
      await scenario.save();

      logger.info('Scenario deleted successfully', {
        scenarioId,
        userId
      });

      res.json({
        success: true,
        message: 'Scenario deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting scenario', {
        error: error.message,
        scenarioId: req.params.scenarioId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete scenario'
      });
    }
  }

  /**
   * UC-008: Search scenarios in history
   */
  async searchScenarios(req, res) {
    try {
      const userId = req.user.id;
      const {
        q,
        tags,
        promptType,
        isFavorite,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      logger.info('Searching scenarios', {
        userId,
        searchTerm: q,
        filters: { tags, promptType, isFavorite, dateFrom, dateTo }
      });

      let scenarios;
      let total;

      if (q) {
        // Text search
        [scenarios, total] = await Promise.all([
          Scenario.searchByUser(userId, q, {
            limit: parseInt(limit),
            skip: (page - 1) * limit,
            sort: { [sort]: order === 'desc' ? -1 : 1 }
          }),
          Scenario.countDocuments({
            userId,
            isDeleted: false,
            $or: [
              { topic: { $regex: q, $options: 'i' } },
              { content: { $regex: q, $options: 'i' } },
              { tags: { $in: [new RegExp(q, 'i')] } }
            ]
          })
        ]);
      } else {
        // Filter-based search
        const filter = { isDeleted: false };
        if (promptType) filter.promptType = promptType;
        if (isFavorite !== undefined) filter.isFavorite = isFavorite === 'true';
        if (tags) {
          const tagsArray = tags.split(',').map(tag => tag.trim());
          filter.tags = { $in: tagsArray };
        }
        if (dateFrom || dateTo) {
          filter.createdAt = {};
          if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
          if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        [scenarios, total] = await Promise.all([
          Scenario.findByUserId(userId, {
            filter,
            limit: parseInt(limit),
            skip: (page - 1) * limit,
            sort: { [sort]: order === 'desc' ? -1 : 1 }
          }),
          Scenario.countDocuments({ userId, ...filter })
        ]);
      }

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          scenarios,
          searchTerm: q,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error searching scenarios', {
        error: error.message,
        userId: req.user?.id,
        searchTerm: req.query.q
      });

      res.status(500).json({
        success: false,
        message: 'Failed to search scenarios'
      });
    }
  }

  /**
   * Bulk operations on scenarios
   */
  async bulkUpdate(req, res) {
    try {
      const userId = req.user.id;
      const { scenarioIds, operation, data } = req.body;

      logger.info('Bulk update scenarios', {
        userId,
        operation,
        scenarioCount: scenarioIds.length
      });

      const scenarios = await Scenario.find({
        scenarioId: { $in: scenarioIds },
        userId,
        isDeleted: false
      });

      if (scenarios.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No scenarios found'
        });
      }

      let updateOperation = {};

      switch (operation) {
        case 'delete':
          updateOperation = {
            isDeleted: true,
            deletedAt: new Date(),
            isPublic: false
          };
          break;
        case 'favorite':
          updateOperation = { isFavorite: true };
          break;
        case 'unfavorite':
          updateOperation = { isFavorite: false };
          break;
        case 'makePublic':
          // Generate share URLs for scenarios that don't have them
          for (const scenario of scenarios) {
            if (!scenario.shareUrl) {
              scenario.shareUrl = uuidv4();
              await scenario.save();
            }
          }
          updateOperation = { isPublic: true };
          break;
        case 'makePrivate':
          updateOperation = { isPublic: false };
          break;
      }

      if (data?.tags) {
        updateOperation.tags = data.tags;
      }

      const result = await Scenario.updateMany(
        {
          scenarioId: { $in: scenarioIds },
          userId,
          isDeleted: false
        },
        { $set: updateOperation }
      );

      logger.info('Bulk update completed', {
        userId,
        operation,
        updated: result.modifiedCount
      });

      res.json({
        success: true,
        message: `Successfully ${operation} ${result.modifiedCount} scenarios`,
        data: {
          updated: result.modifiedCount,
          operation
        }
      });

    } catch (error) {
      logger.error('Error in bulk update', {
        error: error.message,
        userId: req.user?.id,
        operation: req.body.operation
      });

      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update'
      });
    }
  }

  /**
   * UC-010: Get random public scenarios
   */
  async getRandomPublicScenarios(req, res) {
    try {
      const { limit = 10 } = req.query;

      logger.info('Getting random public scenarios', { limit });

      const scenarios = await Scenario.aggregate([
        { $match: { isPublic: true, isDeleted: false } },
        { $sample: { size: parseInt(limit) } },
        { $project: { userId: 0 } } // Hide user IDs for privacy
      ]);

      res.json({
        success: true,
        data: { scenarios }
      });

    } catch (error) {
      logger.error('Error getting random public scenarios', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get random scenarios'
      });
    }
  }

  /**
   * Get public scenario by share URL
   */
  async getPublicScenario(req, res) {
    try {
      const { shareUrl } = req.params;

      const scenario = await Scenario.findOne({
        shareUrl,
        isPublic: true,
        isDeleted: false
      }).select('-userId'); // Hide user ID for privacy

      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: 'Public scenario not found'
        });
      }

      // Increment view count
      scenario.viewCount += 1;
      await scenario.save();

      // Record analytics
      if (process.env.ENABLE_ANALYTICS === 'true') {
        await this.recordAnalyticsEvent(scenario.scenarioId, 'view', {
          userId: 'public'
        });
      }

      res.json({
        success: true,
        data: { scenario: scenario.toPublicJSON() }
      });

    } catch (error) {
      logger.error('Error getting public scenario', {
        error: error.message,
        shareUrl: req.params.shareUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get public scenario'
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      logger.info('Getting user statistics', { userId });

      const [
        totalScenarios,
        favoriteScenarios,
        publicScenarios,
        recentScenarios,
        popularTags
      ] = await Promise.all([
        Scenario.countDocuments({ userId, isDeleted: false }),
        Scenario.countDocuments({ userId, isDeleted: false, isFavorite: true }),
        Scenario.countDocuments({ userId, isDeleted: false, isPublic: true }),
        Scenario.countDocuments({
          userId,
          isDeleted: false,
          createdAt: { $gte: moment().subtract(7, 'days').toDate() }
        }),
        this.getPopularTags(userId)
      ]);

      // Get total views and shares
      const viewShareStats = await Scenario.aggregate([
        { $match: { userId, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$viewCount' },
            totalShares: { $sum: '$shareCount' }
          }
        }
      ]);

      const stats = {
        totalScenarios,
        favoriteScenarios,
        publicScenarios,
        recentScenarios,
        totalViews: viewShareStats[0]?.totalViews || 0,
        totalShares: viewShareStats[0]?.totalShares || 0,
        popularTags
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Error getting user statistics', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get statistics'
      });
    }
  }

  /**
   * Record analytics event
   */
  async recordAnalyticsEvent(scenarioId, event, data = {}) {
    try {
      if (process.env.ENABLE_ANALYTICS !== 'true') {
        return;
      }

      const today = moment().startOf('day').toDate();
      
      let analytics = await ScenarioAnalytics.findOne({
        scenarioId,
        date: today
      });

      if (!analytics) {
        const scenario = await Scenario.findOne({ scenarioId });
        if (!scenario) return;

        analytics = new ScenarioAnalytics({
          scenarioId,
          userId: scenario.userId,
          date: today
        });
      }

      switch (event) {
        case 'view':
          analytics.views += 1;
          if (data.userId && data.userId !== 'anonymous') {
            analytics.uniqueViews += 1;
          }
          break;
        case 'share':
          analytics.shares += 1;
          if (data.platform) {
            analytics.sharesByPlatform[data.platform] += 1;
          }
          break;
        case 'rate':
          analytics.ratings.push({
            rating: data.rating,
            timestamp: new Date()
          });
          // Recalculate average
          const totalRating = analytics.ratings.reduce((sum, r) => sum + r.rating, 0);
          analytics.averageRating = totalRating / analytics.ratings.length;
          break;
      }

      await analytics.save();

    } catch (error) {
      logger.error('Error recording analytics event', {
        error: error.message,
        scenarioId,
        event
      });
    }
  }

  /**
   * Get popular tags for user
   */
  async getPopularTags(userId) {
    try {
      const tagStats = await Scenario.aggregate([
        { $match: { userId, isDeleted: false } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return tagStats.map(stat => ({
        tag: stat._id,
        count: stat.count
      }));
    } catch (error) {
      logger.error('Error getting popular tags', { error: error.message, userId });
      return [];
    }
  }
}

module.exports = ScenarioController;