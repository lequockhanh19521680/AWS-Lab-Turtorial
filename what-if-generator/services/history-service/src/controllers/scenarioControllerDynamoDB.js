/**
 * Scenario Controller for DynamoDB
 * Updated to use DynamoDB instead of MongoDB
 */

const ScenarioDynamoDB = require('../models/ScenarioDynamoDB');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Initialize DynamoDB model
const Scenario = new ScenarioDynamoDB();

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
      const existingScenario = await Scenario.findById(scenarioData.scenarioId);

      if (existingScenario) {
        return res.status(409).json({
          success: false,
          message: 'Scenario already exists'
        });
      }

      const scenario = await Scenario.create(scenarioData);

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

      // Build filter for DynamoDB
      const filter = { isDeleted: false };
      if (promptType) filter.promptType = promptType;
      if (isFavorite !== undefined) filter.isFavorite = isFavorite === 'true';
      if (tags) {
        filter.tags = tags.split(',').map(tag => tag.trim());
      }

      const skip = (page - 1) * limit;
      const scenarios = await Scenario.findByUserId(userId, {
        filter,
        sort: order === 'desc' ? 'desc' : 'asc',
        limit: parseInt(limit),
        skip
      });

      // For pagination, we need to get total count
      // This is expensive in DynamoDB, consider caching or using a separate counter
      const allUserScenarios = await Scenario.findByUserId(userId, { limit: 1000 });
      const total = allUserScenarios.length;
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

      const scenario = await Scenario.findById(scenarioId);

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
        await Scenario.incrementViewCount(scenarioId);
        scenario.viewCount += 1;

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

      const scenario = await Scenario.findById(scenarioId);

      if (!scenario || scenario.userId !== userId || scenario.isDeleted) {
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

      const updatedScenario = await Scenario.update(scenarioId, updateData);

      logger.info('Scenario updated successfully', {
        scenarioId,
        userId
      });

      res.json({
        success: true,
        message: 'Scenario updated successfully',
        data: { scenario: updatedScenario }
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

      const scenario = await Scenario.findById(scenarioId);

      if (!scenario || scenario.userId !== userId || scenario.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Scenario not found'
        });
      }

      // Soft delete
      await Scenario.update(scenarioId, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        isPublic: false // Remove from public if it was public
      });

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
        // Text search using DynamoDB model
        scenarios = await Scenario.searchByUser(userId, q, {
          limit: parseInt(limit),
          skip: (page - 1) * limit,
          sort: order === 'desc' ? 'desc' : 'asc'
        });

        // Get total for pagination (expensive operation)
        const allSearchResults = await Scenario.searchByUser(userId, q, { limit: 1000 });
        total = allSearchResults.length;
      } else {
        // Filter-based search
        const filter = { isDeleted: false };
        if (promptType) filter.promptType = promptType;
        if (isFavorite !== undefined) filter.isFavorite = isFavorite === 'true';
        if (tags) {
          filter.tags = tags.split(',').map(tag => tag.trim());
        }

        scenarios = await Scenario.findByUserId(userId, {
          filter,
          limit: parseInt(limit),
          skip: (page - 1) * limit,
          sort: order === 'desc' ? 'desc' : 'asc'
        });

        // Get total for pagination
        const allUserScenarios = await Scenario.findByUserId(userId, { limit: 1000 });
        total = allUserScenarios.filter(s => {
          if (filter.promptType && s.promptType !== filter.promptType) return false;
          if (filter.isFavorite !== undefined && s.isFavorite !== filter.isFavorite) return false;
          if (filter.tags && !filter.tags.some(tag => s.tags.includes(tag))) return false;
          return true;
        }).length;
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

      let updatedCount = 0;

      // Process each scenario individually (DynamoDB doesn't support bulk updates like MongoDB)
      for (const scenarioId of scenarioIds) {
        try {
          const scenario = await Scenario.findById(scenarioId);
          
          if (!scenario || scenario.userId !== userId || scenario.isDeleted) {
            continue;
          }

          let updateOperation = {};

          switch (operation) {
            case 'delete':
              updateOperation = {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
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
              if (!scenario.shareUrl) {
                updateOperation.shareUrl = uuidv4();
              }
              updateOperation.isPublic = true;
              break;
            case 'makePrivate':
              updateOperation = { isPublic: false };
              break;
          }

          if (data?.tags) {
            updateOperation.tags = data.tags;
          }

          await Scenario.update(scenarioId, updateOperation);
          updatedCount++;

        } catch (error) {
          logger.error('Error updating scenario in bulk operation', {
            error: error.message,
            scenarioId,
            operation
          });
        }
      }

      logger.info('Bulk update completed', {
        userId,
        operation,
        updated: updatedCount
      });

      res.json({
        success: true,
        message: `Successfully ${operation} ${updatedCount} scenarios`,
        data: {
          updated: updatedCount,
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

      const scenarios = await Scenario.getPublicScenarios({
        limit: parseInt(limit)
      });

      // Shuffle and limit results for randomness
      const shuffled = scenarios.sort(() => 0.5 - Math.random());
      const randomScenarios = shuffled.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: { scenarios: randomScenarios }
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

      // Find scenario by share URL (this requires a scan operation in DynamoDB)
      const scenarios = await Scenario.scan(
        'shareUrl = :shareUrl AND isPublic = :isPublic AND isDeleted = :isDeleted',
        {
          ':shareUrl': shareUrl,
          ':isPublic': true,
          ':isDeleted': false
        }
      );

      const scenario = scenarios[0];

      if (!scenario) {
        return res.status(404).json({
          success: false,
          message: 'Public scenario not found'
        });
      }

      // Increment view count
      await Scenario.incrementViewCount(scenario.scenarioId);
      scenario.viewCount += 1;

      // Record analytics
      if (process.env.ENABLE_ANALYTICS === 'true') {
        await this.recordAnalyticsEvent(scenario.scenarioId, 'view', {
          userId: 'public'
        });
      }

      // Remove sensitive data for public view
      const publicScenario = { ...scenario };
      delete publicScenario.userId;

      res.json({
        success: true,
        data: { scenario: publicScenario }
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

      const stats = await Scenario.getUserStats(userId);

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
   * Record analytics event (simplified for DynamoDB)
   */
  async recordAnalyticsEvent(scenarioId, event, data = {}) {
    try {
      if (process.env.ENABLE_ANALYTICS !== 'true') {
        return;
      }

      // For now, we'll just log analytics events
      // In a production system, you'd want to use a dedicated analytics service
      logger.info('Analytics event recorded', {
        scenarioId,
        event,
        data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error recording analytics event', {
        error: error.message,
        scenarioId,
        event
      });
    }
  }
}

module.exports = ScenarioController;