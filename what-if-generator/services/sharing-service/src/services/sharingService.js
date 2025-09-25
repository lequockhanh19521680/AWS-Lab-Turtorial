const SharedScenario = require('../models/SharedScenario');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const axios = require('axios');
const QRCode = require('qrcode');

class SharingService {
  /**
   * UC-006: Create share link for scenario
   */
  async createShare(scenarioId, userId, options = {}) {
    try {
      logger.info('Creating share for scenario', { scenarioId, userId, options });

      // Check if scenario already has a share
      let existingShare = await SharedScenario.findOne({
        scenarioId,
        userId,
        isActive: true
      });

      if (existingShare && !options.forceNew) {
        logger.info('Returning existing share', { shareUrl: existingShare.shareUrl });
        return existingShare;
      }

      // Get scenario data from history service
      const scenarioData = await this.getScenarioData(scenarioId, userId);
      
      if (!scenarioData) {
        throw new Error('Scenario not found or access denied');
      }

      // Generate unique share URL
      const shareUrl = uuidv4();
      
      // Create share record
      const shareData = {
        scenarioId,
        userId,
        shareUrl,
        scenarioData: {
          topic: scenarioData.topic,
          content: scenarioData.content,
          promptType: scenarioData.promptType || 'default',
          tags: scenarioData.tags || [],
          generatedAt: scenarioData.generatedAt
        },
        title: options.title || null,
        description: options.description || null,
        isPasswordProtected: !!options.password,
        password: options.password || null,
        expiresAt: options.expiresAt || null
      };

      const sharedScenario = new SharedScenario(shareData);
      await sharedScenario.save();

      // Generate short URL if configured
      if (process.env.URL_SHORTENER_API_KEY) {
        try {
          const shortUrl = await this.generateShortUrl(sharedScenario.fullShareUrl);
          sharedScenario.shortUrl = shortUrl;
          await sharedScenario.save();
        } catch (error) {
          logger.warn('Failed to generate short URL', { error: error.message });
        }
      }

      logger.info('Share created successfully', { 
        shareUrl: sharedScenario.shareUrl,
        scenarioId,
        userId 
      });

      return sharedScenario;

    } catch (error) {
      logger.error('Error creating share', {
        error: error.message,
        scenarioId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get shared scenario by share URL
   */
  async getSharedScenario(shareUrl, password = null, metadata = {}) {
    try {
      const sharedScenario = await SharedScenario.findByShareUrl(shareUrl);

      if (!sharedScenario) {
        throw new Error('Shared scenario not found or expired');
      }

      if (!sharedScenario.isAccessible()) {
        throw new Error('Shared scenario is not accessible');
      }

      // Check password if required
      if (sharedScenario.isPasswordProtected) {
        if (!password || sharedScenario.password !== password) {
          throw new Error('Password required or incorrect');
        }
      }

      // Increment view count with metadata
      await sharedScenario.incrementView(metadata);

      logger.info('Shared scenario accessed', {
        shareUrl,
        scenarioId: sharedScenario.scenarioId,
        viewCount: sharedScenario.viewCount
      });

      return sharedScenario;

    } catch (error) {
      logger.error('Error getting shared scenario', {
        error: error.message,
        shareUrl
      });
      throw error;
    }
  }

  /**
   * Update share settings
   */
  async updateShare(shareUrl, userId, updates) {
    try {
      const sharedScenario = await SharedScenario.findOne({
        shareUrl,
        userId
      });

      if (!sharedScenario) {
        throw new Error('Shared scenario not found');
      }

      // Apply updates
      Object.assign(sharedScenario, updates);
      await sharedScenario.save();

      logger.info('Share updated', { shareUrl, updates });

      return sharedScenario;

    } catch (error) {
      logger.error('Error updating share', {
        error: error.message,
        shareUrl,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete/deactivate share
   */
  async deleteShare(shareUrl, userId) {
    try {
      const sharedScenario = await SharedScenario.findOne({
        shareUrl,
        userId
      });

      if (!sharedScenario) {
        throw new Error('Shared scenario not found');
      }

      sharedScenario.isActive = false;
      await sharedScenario.save();

      logger.info('Share deleted', { shareUrl, userId });

      return true;

    } catch (error) {
      logger.error('Error deleting share', {
        error: error.message,
        shareUrl,
        userId
      });
      throw error;
    }
  }

  /**
   * Record share event
   */
  async recordShare(shareUrl, platform = 'other') {
    try {
      const sharedScenario = await SharedScenario.findOne({ shareUrl });

      if (!sharedScenario) {
        throw new Error('Shared scenario not found');
      }

      await sharedScenario.incrementShare(platform);

      logger.info('Share event recorded', {
        shareUrl,
        platform,
        shareCount: sharedScenario.shareCount
      });

      return sharedScenario;

    } catch (error) {
      logger.error('Error recording share', {
        error: error.message,
        shareUrl,
        platform
      });
      throw error;
    }
  }

  /**
   * Generate QR code for share URL
   */
  async generateQRCode(shareUrl) {
    try {
      const sharedScenario = await SharedScenario.findByShareUrl(shareUrl);

      if (!sharedScenario) {
        throw new Error('Shared scenario not found');
      }

      const qrCodeUrl = sharedScenario.fullShareUrl;
      const qrCodeOptions = {
        width: parseInt(process.env.QR_CODE_SIZE) || 200,
        errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION || 'M',
        type: 'image/png',
        margin: 2
      };

      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, qrCodeOptions);

      // Record QR code generation as a share event
      await this.recordShare(shareUrl, 'qr');

      logger.info('QR code generated', { shareUrl });

      return qrCodeDataUrl;

    } catch (error) {
      logger.error('Error generating QR code', {
        error: error.message,
        shareUrl
      });
      throw error;
    }
  }

  /**
   * Get user's shared scenarios
   */
  async getUserShares(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        includeInactive = false
      } = options;

      const query = { userId };
      if (!includeInactive) {
        query.isActive = true;
      }

      const sortObj = { [sort]: order === 'desc' ? -1 : 1 };
      const skip = (page - 1) * limit;

      const [shares, total] = await Promise.all([
        SharedScenario.find(query)
          .sort(sortObj)
          .limit(limit)
          .skip(skip),
        SharedScenario.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        shares,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Error getting user shares', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get sharing analytics for user
   */
  async getShareAnalytics(userId, dateFrom = null, dateTo = null) {
    try {
      const matchStage = { userId };
      
      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }

      const analytics = await SharedScenario.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalShares: { $sum: 1 },
            totalViews: { $sum: '$viewCount' },
            totalShareEvents: { $sum: '$shareCount' },
            activeShares: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            sharesByPlatform: {
              $push: '$sharesByPlatform'
            }
          }
        }
      ]);

      const result = analytics[0] || {
        totalShares: 0,
        totalViews: 0,
        totalShareEvents: 0,
        activeShares: 0,
        sharesByPlatform: []
      };

      // Aggregate platform statistics
      if (result.sharesByPlatform.length > 0) {
        const platformStats = {};
        result.sharesByPlatform.forEach(shares => {
          Object.keys(shares).forEach(platform => {
            platformStats[platform] = (platformStats[platform] || 0) + shares[platform];
          });
        });
        result.platformStats = platformStats;
      }

      delete result.sharesByPlatform;

      return result;

    } catch (error) {
      logger.error('Error getting share analytics', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get scenario data from history service
   */
  async getScenarioData(scenarioId, userId) {
    try {
      const historyServiceUrl = process.env.HISTORY_SERVICE_URL;
      
      if (!historyServiceUrl) {
        throw new Error('History service URL not configured');
      }

      const response = await axios.get(
        `${historyServiceUrl}/scenarios/${scenarioId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.generateServiceToken(userId)}`
          },
          timeout: 5000
        }
      );

      if (response.data.success) {
        return response.data.data.scenario;
      } else {
        throw new Error('Failed to get scenario data');
      }

    } catch (error) {
      logger.error('Error getting scenario data from history service', {
        error: error.message,
        scenarioId,
        userId
      });
      return null;
    }
  }

  /**
   * Generate short URL using external service
   */
  async generateShortUrl(longUrl) {
    try {
      // This is a placeholder for URL shortener integration
      // You would implement actual URL shortener API calls here
      const domain = process.env.URL_SHORTENER_DOMAIN || 'short.ly';
      const shortCode = Math.random().toString(36).substr(2, 8);
      return `https://${domain}/${shortCode}`;

    } catch (error) {
      logger.error('Error generating short URL', {
        error: error.message,
        longUrl
      });
      throw error;
    }
  }

  /**
   * Generate service token for internal API calls
   */
  generateServiceToken(userId) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    
    return jwt.sign(
      {
        id: userId,
        service: 'sharing-service',
        type: 'service'
      },
      JWT_SECRET,
      {
        expiresIn: '5m',
        issuer: 'what-if-generator',
        audience: 'what-if-generator-services'
      }
    );
  }

  /**
   * Cleanup expired shares
   */
  async cleanupExpiredShares() {
    try {
      const result = await SharedScenario.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} expired shares`);
      }

      return result.deletedCount;

    } catch (error) {
      logger.error('Error cleaning up expired shares', {
        error: error.message
      });
      return 0;
    }
  }
}

module.exports = SharingService;