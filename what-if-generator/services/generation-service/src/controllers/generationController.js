const AIService = require('../services/aiService');
const axios = require('axios');
const logger = require('../config/logger');

class GenerationController {
  constructor() {
    this.aiService = new AIService();
  }

  /**
   * UC-001: Generate a new scenario
   */
  async generateScenario(req, res) {
    try {
      const { topic, options = {} } = req.body;
      const userId = req.user?.id;

      logger.info('Generating scenario', { 
        topic, 
        userId, 
        options,
        ip: req.ip 
      });

      const scenario = await this.aiService.generateScenario(topic, options);

      // Save to history if user is authenticated
      if (userId && scenario) {
        try {
          await this.saveToHistory(userId, scenario);
        } catch (historyError) {
          logger.warn('Failed to save to history', { 
            userId, 
            scenarioId: scenario.id,
            error: historyError.message 
          });
          // Continue without failing the request
        }
      }

      res.json({
        success: true,
        message: 'Viễn cảnh đã được tạo thành công',
        data: {
          scenario,
          userAuthenticated: !!userId
        }
      });

    } catch (error) {
      logger.error('Generate scenario error', {
        error: error.message,
        topic: req.body.topic,
        userId: req.user?.id
      });

      // Return user-friendly error messages
      let errorMessage = 'Có lỗi xảy ra khi tạo viễn cảnh, vui lòng thử lại';
      let statusCode = 500;

      if (error.message.includes('inappropriate content')) {
        errorMessage = 'Chủ đề không phù hợp, vui lòng chọn chủ đề khác';
        statusCode = 400;
      } else if (error.message.includes('too long')) {
        errorMessage = 'Chủ đề quá dài, vui lòng rút ngắn';
        statusCode = 400;
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = 'Hệ thống đang quá tải, vui lòng thử lại sau';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Quá trình tạo viễn cảnh mất quá nhiều thời gian, vui lòng thử lại';
        statusCode = 408;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        code: error.code || 'GENERATION_ERROR'
      });
    }
  }

  /**
   * UC-010: Generate random public scenario
   */
  async generateRandomScenario(req, res) {
    try {
      logger.info('Generating random scenario', { 
        ip: req.ip,
        userId: req.user?.id 
      });

      const scenario = await this.aiService.generateRandomScenario();

      res.json({
        success: true,
        message: 'Viễn cảnh ngẫu nhiên đã được tạo',
        data: { scenario }
      });

    } catch (error) {
      logger.error('Generate random scenario error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Không thể tạo viễn cảnh ngẫu nhiên, vui lòng thử lại'
      });
    }
  }

  /**
   * Regenerate scenario with different options
   */
  async regenerateScenario(req, res) {
    try {
      const { topic, previousScenarioId, options = {} } = req.body;
      const userId = req.user?.id;

      logger.info('Regenerating scenario', { 
        topic, 
        previousScenarioId,
        userId,
        options 
      });

      // Force new generation
      const scenario = await this.aiService.generateScenario(topic, {
        ...options,
        forceNew: true
      });

      // Save to history if user is authenticated
      if (userId && scenario) {
        try {
          await this.saveToHistory(userId, scenario, previousScenarioId);
        } catch (historyError) {
          logger.warn('Failed to save regenerated scenario to history', { 
            userId, 
            scenarioId: scenario.id,
            error: historyError.message 
          });
        }
      }

      res.json({
        success: true,
        message: 'Viễn cảnh đã được tạo lại thành công',
        data: { scenario }
      });

    } catch (error) {
      logger.error('Regenerate scenario error', {
        error: error.message,
        topic: req.body.topic,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Không thể tạo lại viễn cảnh, vui lòng thử lại'
      });
    }
  }

  /**
   * Generate multiple scenarios at once (batch)
   */
  async batchGenerate(req, res) {
    try {
      const { topics, options = {} } = req.body;
      const userId = req.user?.id;

      logger.info('Batch generating scenarios', { 
        topicsCount: topics.length,
        userId,
        options 
      });

      const scenarios = [];
      const errors = [];

      // Generate scenarios concurrently but with limit
      const concurrencyLimit = 3; // Don't overwhelm the AI service
      
      for (let i = 0; i < topics.length; i += concurrencyLimit) {
        const batch = topics.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (topic, index) => {
          try {
            const scenario = await this.aiService.generateScenario(topic, options);
            return { index: i + index, scenario };
          } catch (error) {
            return { index: i + index, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.scenario) {
            scenarios[result.index] = result.scenario;
          } else {
            errors[result.index] = result.error;
          }
        });
      }

      // Save successful scenarios to history
      if (userId) {
        for (const scenario of scenarios.filter(Boolean)) {
          try {
            await this.saveToHistory(userId, scenario);
          } catch (historyError) {
            logger.warn('Failed to save batch scenario to history', { 
              userId, 
              scenarioId: scenario.id,
              error: historyError.message 
            });
          }
        }
      }

      res.json({
        success: true,
        message: `Đã tạo thành công ${scenarios.filter(Boolean).length}/${topics.length} viễn cảnh`,
        data: {
          scenarios,
          errors,
          summary: {
            total: topics.length,
            successful: scenarios.filter(Boolean).length,
            failed: errors.filter(Boolean).length
          }
        }
      });

    } catch (error) {
      logger.error('Batch generate error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo hàng loạt viễn cảnh'
      });
    }
  }

  /**
   * Get AI provider health status
   */
  async getProviderHealth(req, res) {
    try {
      const health = await this.aiService.healthCheck();
      const providerInfo = this.aiService.getProviderInfo();

      res.json({
        success: true,
        data: {
          ...health,
          ...providerInfo,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Provider health check error', { error: error.message });

      res.status(500).json({
        success: false,
        message: 'Không thể kiểm tra trạng thái AI provider',
        data: {
          status: 'error',
          error: error.message
        }
      });
    }
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats(req, res) {
    try {
      // This would be implemented with proper analytics
      // For now, return basic info
      const stats = {
        totalGenerated: 0, // Would come from database
        todayGenerated: 0,
        popularTopics: [],
        providerInfo: this.aiService.getProviderInfo()
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Get generation stats error', { error: error.message });

      res.status(500).json({
        success: false,
        message: 'Không thể lấy thống kê'
      });
    }
  }

  /**
   * Clear cache for a specific topic
   */
  async clearCache(req, res) {
    try {
      const { topic } = req.body;

      await this.aiService.clearCache(topic);

      res.json({
        success: true,
        message: 'Cache đã được xóa thành công'
      });

    } catch (error) {
      logger.error('Clear cache error', { error: error.message });

      res.status(500).json({
        success: false,
        message: 'Không thể xóa cache'
      });
    }
  }

  /**
   * Save generated scenario to history service
   */
  async saveToHistory(userId, scenario, previousScenarioId = null) {
    try {
      const historyServiceUrl = process.env.HISTORY_SERVICE_URL;
      
      if (!historyServiceUrl) {
        throw new Error('History service URL not configured');
      }

      const historyData = {
        userId,
        scenarioId: scenario.id,
        topic: scenario.topic,
        content: scenario.content,
        promptType: scenario.promptType,
        provider: scenario.provider,
        model: scenario.model,
        tokens: scenario.tokens,
        generatedAt: scenario.generatedAt,
        previousScenarioId
      };

      await axios.post(`${historyServiceUrl}/scenarios`, historyData, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.debug('Scenario saved to history', { 
        userId, 
        scenarioId: scenario.id 
      });

    } catch (error) {
      logger.error('Failed to save to history service', {
        error: error.message,
        userId,
        scenarioId: scenario.id
      });
      throw error;
    }
  }
}

module.exports = GenerationController;