/**
 * DynamoDB Model for Scenarios
 * Migrated from MongoDB to DynamoDB for better AWS integration
 */

const { v4: uuidv4 } = require('uuid');
const { dynamoDBClient, getTableName } = require('../../../../shared/config/dynamodb');

class ScenarioDynamoDB {
  constructor() {
    this.tableName = 'scenarios';
    this.tableConfig = getTableName(this.tableName);
  }

  /**
   * Create a new scenario
   */
  async create(scenarioData) {
    try {
      const scenarioId = scenarioData.scenarioId || uuidv4();
      
      const item = {
        scenarioId,
        userId: scenarioData.userId,
        topic: scenarioData.topic,
        content: scenarioData.content,
        promptType: scenarioData.promptType || 'default',
        provider: scenarioData.provider || 'gemini',
        model: scenarioData.model || 'gemini-pro',
        tokens: scenarioData.tokens || { prompt: 0, completion: 0, total: 0 },
        tags: scenarioData.tags || [],
        isPublic: scenarioData.isPublic || false,
        shareUrl: scenarioData.shareUrl || null,
        isFavorite: scenarioData.isFavorite || false,
        rating: scenarioData.rating || null,
        viewCount: scenarioData.viewCount || 0,
        shareCount: scenarioData.shareCount || 0,
        previousScenarioId: scenarioData.previousScenarioId || null,
        generatedAt: scenarioData.generatedAt || new Date().toISOString(),
        isDeleted: scenarioData.isDeleted || false,
        deletedAt: scenarioData.deletedAt || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBClient.putItem(this.tableName, item);
      return item;
    } catch (error) {
      console.error('Error creating scenario:', error);
      throw error;
    }
  }

  /**
   * Get scenario by ID
   */
  async findById(scenarioId) {
    try {
      const item = await dynamoDBClient.getItem(this.tableName, { scenarioId });
      
      if (item && item.isDeleted) {
        return null; // Soft delete
      }
      
      return item;
    } catch (error) {
      console.error('Error finding scenario by ID:', error);
      throw error;
    }
  }

  /**
   * Get scenarios by user ID
   */
  async findByUserId(userId, options = {}) {
    try {
      const limit = options.limit || 20;
      const sortOrder = options.sort === 'asc' ? 'ASC' : 'DESC';
      
      const keyConditionExpression = 'userId = :userId AND createdAt BETWEEN :start AND :end';
      const expressionAttributeValues = {
        ':userId': userId,
        ':start': '1900-01-01T00:00:00.000Z',
        ':end': '9999-12-31T23:59:59.999Z'
      };

      if (options.filter && options.filter.isDeleted !== undefined) {
        // Add filter for soft delete
        const items = await dynamoDBClient.query(
          this.tableName,
          keyConditionExpression,
          expressionAttributeValues,
          'userId-createdAt-index'
        );

        // Filter results (DynamoDB doesn't support complex filters in queries)
        let filteredItems = items.filter(item => 
          item.isDeleted === (options.filter.isDeleted || false)
        );

        // Apply additional filters
        if (options.filter.isFavorite !== undefined) {
          filteredItems = filteredItems.filter(item => item.isFavorite === options.filter.isFavorite);
        }

        if (options.filter.promptType) {
          filteredItems = filteredItems.filter(item => item.promptType === options.filter.promptType);
        }

        // Sort results
        filteredItems.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
        });

        // Apply pagination
        const skip = options.skip || 0;
        return filteredItems.slice(skip, skip + limit);
      }

      const items = await dynamoDBClient.query(
        this.tableName,
        keyConditionExpression,
        expressionAttributeValues,
        'userId-createdAt-index'
      );

      // Filter out deleted items
      const activeItems = items.filter(item => !item.isDeleted);

      // Sort results
      activeItems.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });

      // Apply pagination
      const skip = options.skip || 0;
      return activeItems.slice(skip, skip + limit);
    } catch (error) {
      console.error('Error finding scenarios by user ID:', error);
      throw error;
    }
  }

  /**
   * Search scenarios by user
   */
  async searchByUser(userId, searchTerm, options = {}) {
    try {
      // Get all user scenarios first
      const userScenarios = await this.findByUserId(userId, { limit: 1000 });
      
      // Filter by search term
      const searchResults = userScenarios.filter(scenario => {
        const searchLower = searchTerm.toLowerCase();
        return (
          scenario.topic.toLowerCase().includes(searchLower) ||
          scenario.content.toLowerCase().includes(searchLower) ||
          scenario.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      });

      // Apply sorting
      const sortOrder = options.sort === 'asc' ? 'asc' : 'desc';
      searchResults.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });

      // Apply pagination
      const limit = options.limit || 20;
      const skip = options.skip || 0;
      return searchResults.slice(skip, skip + limit);
    } catch (error) {
      console.error('Error searching scenarios by user:', error);
      throw error;
    }
  }

  /**
   * Get public scenarios
   */
  async getPublicScenarios(options = {}) {
    try {
      // Scan for public scenarios (note: this is expensive, consider using GSI in production)
      const items = await dynamoDBClient.scan(
        this.tableName,
        'isPublic = :isPublic AND isDeleted = :isDeleted',
        {
          ':isPublic': true,
          ':isDeleted': false
        }
      );

      // Sort results
      const sortOrder = options.sort === 'asc' ? 'asc' : 'desc';
      items.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });

      // Apply pagination
      const limit = options.limit || 20;
      const skip = options.skip || 0;
      return items.slice(skip, skip + limit);
    } catch (error) {
      console.error('Error getting public scenarios:', error);
      throw error;
    }
  }

  /**
   * Update scenario
   */
  async update(scenarioId, updateData) {
    try {
      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};

      // Build update expression dynamically
      Object.keys(updateData).forEach((key, index) => {
        if (key !== 'scenarioId') { // Don't allow updating the primary key
          const valueKey = `:val${index}`;
          const nameKey = `#attr${index}`;
          
          updateExpression.push(`${nameKey} = ${valueKey}`);
          expressionAttributeValues[valueKey] = updateData[key];
          expressionAttributeNames[nameKey] = key;
        }
      });

      // Always update the updatedAt timestamp
      const updatedAtKey = `:val${Object.keys(updateData).length}`;
      const updatedAtNameKey = `#attr${Object.keys(updateData).length}`;
      updateExpression.push(`${updatedAtNameKey} = ${updatedAtKey}`);
      expressionAttributeValues[updatedAtKey] = new Date().toISOString();
      expressionAttributeNames[updatedAtNameKey] = 'updatedAt';

      const result = await dynamoDBClient.updateItem(
        this.tableName,
        { scenarioId },
        `SET ${updateExpression.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
      );

      return result;
    } catch (error) {
      console.error('Error updating scenario:', error);
      throw error;
    }
  }

  /**
   * Soft delete scenario
   */
  async delete(scenarioId) {
    try {
      return await this.update(scenarioId, {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw error;
    }
  }

  /**
   * Hard delete scenario (permanent removal)
   */
  async hardDelete(scenarioId) {
    try {
      await dynamoDBClient.deleteItem(this.tableName, { scenarioId });
      return { success: true };
    } catch (error) {
      console.error('Error hard deleting scenario:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(scenarioId) {
    try {
      const result = await dynamoDBClient.updateItem(
        this.tableName,
        { scenarioId },
        'ADD viewCount :inc SET updatedAt = :updatedAt',
        {
          ':inc': 1,
          ':updatedAt': new Date().toISOString()
        }
      );

      return result;
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  }

  /**
   * Increment share count
   */
  async incrementShareCount(scenarioId) {
    try {
      const result = await dynamoDBClient.updateItem(
        this.tableName,
        { scenarioId },
        'ADD shareCount :inc SET updatedAt = :updatedAt',
        {
          ':inc': 1,
          ':updatedAt': new Date().toISOString()
        }
      );

      return result;
    } catch (error) {
      console.error('Error incrementing share count:', error);
      throw error;
    }
  }

  /**
   * Get scenario analytics
   */
  async getAnalytics(scenarioId, dateRange = null) {
    try {
      // This would typically query a separate analytics table
      // For now, return basic stats from the scenario itself
      const scenario = await this.findById(scenarioId);
      if (!scenario) {
        return null;
      }

      return {
        scenarioId,
        viewCount: scenario.viewCount || 0,
        shareCount: scenario.shareCount || 0,
        rating: scenario.rating,
        isPublic: scenario.isPublic,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt
      };
    } catch (error) {
      console.error('Error getting scenario analytics:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const userScenarios = await this.findByUserId(userId, { limit: 1000 });
      
      const stats = {
        totalScenarios: userScenarios.length,
        totalViews: userScenarios.reduce((sum, s) => sum + (s.viewCount || 0), 0),
        totalShares: userScenarios.reduce((sum, s) => sum + (s.shareCount || 0), 0),
        publicScenarios: userScenarios.filter(s => s.isPublic).length,
        favoriteScenarios: userScenarios.filter(s => s.isFavorite).length,
        averageRating: 0,
        promptTypes: {},
        tags: {}
      };

      // Calculate average rating
      const ratedScenarios = userScenarios.filter(s => s.rating && s.rating > 0);
      if (ratedScenarios.length > 0) {
        stats.averageRating = ratedScenarios.reduce((sum, s) => sum + s.rating, 0) / ratedScenarios.length;
      }

      // Count prompt types
      userScenarios.forEach(scenario => {
        stats.promptTypes[scenario.promptType] = (stats.promptTypes[scenario.promptType] || 0) + 1;
      });

      // Count tags
      userScenarios.forEach(scenario => {
        scenario.tags.forEach(tag => {
          stats.tags[tag] = (stats.tags[tag] || 0) + 1;
        });
      });

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = ScenarioDynamoDB;