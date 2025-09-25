const SharingService = require('../services/sharingService');
const logger = require('../config/logger');

class SharingController {
  constructor() {
    this.sharingService = new SharingService();
  }

  /**
   * UC-006: Create share link for scenario
   */
  async createShare(req, res) {
    try {
      const { scenarioId } = req.params;
      const userId = req.user.id;
      const options = req.body;

      logger.info('Creating share link', {
        scenarioId,
        userId,
        options
      });

      const sharedScenario = await this.sharingService.createShare(
        scenarioId,
        userId,
        options
      );

      res.status(201).json({
        success: true,
        message: 'Share link created successfully',
        data: {
          shareUrl: sharedScenario.shareUrl,
          fullUrl: sharedScenario.fullShareUrl,
          shortUrl: sharedScenario.shortUrl,
          qrCodeUrl: sharedScenario.qrCodeUrl,
          expiresAt: sharedScenario.expiresAt,
          isPasswordProtected: sharedScenario.isPasswordProtected
        }
      });

    } catch (error) {
      logger.error('Error creating share', {
        error: error.message,
        scenarioId: req.params.scenarioId,
        userId: req.user?.id
      });

      let statusCode = 500;
      let message = 'Failed to create share link';

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        statusCode = 404;
        message = 'Scenario not found or access denied';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Get shared scenario by share URL
   */
  async getSharedScenario(req, res) {
    try {
      const { shareUrl } = req.params;
      const { password } = req.query;

      // Extract metadata from request
      const metadata = {
        device: this.detectDevice(req.get('User-Agent')),
        country: req.get('CF-IPCountry') || null, // Cloudflare country header
        referrer: req.get('Referer') || null
      };

      logger.info('Accessing shared scenario', {
        shareUrl,
        metadata
      });

      const sharedScenario = await this.sharingService.getSharedScenario(
        shareUrl,
        password,
        metadata
      );

      res.json({
        success: true,
        data: {
          scenario: {
            shareUrl: sharedScenario.shareUrl,
            title: sharedScenario.title,
            description: sharedScenario.description,
            scenarioData: sharedScenario.scenarioData,
            viewCount: sharedScenario.viewCount,
            shareCount: sharedScenario.shareCount,
            createdAt: sharedScenario.createdAt
          }
        }
      });

    } catch (error) {
      logger.error('Error getting shared scenario', {
        error: error.message,
        shareUrl: req.params.shareUrl
      });

      let statusCode = 500;
      let message = 'Failed to get shared scenario';

      if (error.message.includes('not found') || error.message.includes('expired')) {
        statusCode = 404;
        message = 'Shared scenario not found or expired';
      } else if (error.message.includes('password')) {
        statusCode = 401;
        message = 'Password required or incorrect';
      } else if (error.message.includes('not accessible')) {
        statusCode = 403;
        message = 'Shared scenario is not accessible';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Update share settings
   */
  async updateShare(req, res) {
    try {
      const { shareUrl } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      logger.info('Updating share settings', {
        shareUrl,
        userId,
        updates
      });

      const sharedScenario = await this.sharingService.updateShare(
        shareUrl,
        userId,
        updates
      );

      res.json({
        success: true,
        message: 'Share settings updated successfully',
        data: {
          shareUrl: sharedScenario.shareUrl,
          title: sharedScenario.title,
          description: sharedScenario.description,
          isPasswordProtected: sharedScenario.isPasswordProtected,
          expiresAt: sharedScenario.expiresAt,
          isActive: sharedScenario.isActive
        }
      });

    } catch (error) {
      logger.error('Error updating share', {
        error: error.message,
        shareUrl: req.params.shareUrl,
        userId: req.user?.id
      });

      let statusCode = 500;
      let message = 'Failed to update share';

      if (error.message.includes('not found')) {
        statusCode = 404;
        message = 'Shared scenario not found';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Delete share
   */
  async deleteShare(req, res) {
    try {
      const { shareUrl } = req.params;
      const userId = req.user.id;

      logger.info('Deleting share', {
        shareUrl,
        userId
      });

      await this.sharingService.deleteShare(shareUrl, userId);

      res.json({
        success: true,
        message: 'Share deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting share', {
        error: error.message,
        shareUrl: req.params.shareUrl,
        userId: req.user?.id
      });

      let statusCode = 500;
      let message = 'Failed to delete share';

      if (error.message.includes('not found')) {
        statusCode = 404;
        message = 'Shared scenario not found';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Record share event
   */
  async recordShare(req, res) {
    try {
      const { shareUrl } = req.params;
      const { platform = 'other' } = req.body;

      logger.info('Recording share event', {
        shareUrl,
        platform
      });

      await this.sharingService.recordShare(shareUrl, platform);

      res.json({
        success: true,
        message: 'Share event recorded'
      });

    } catch (error) {
      logger.error('Error recording share', {
        error: error.message,
        shareUrl: req.params.shareUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to record share event'
      });
    }
  }

  /**
   * Generate QR code for share
   */
  async generateQRCode(req, res) {
    try {
      const { shareUrl } = req.params;

      logger.info('Generating QR code', { shareUrl });

      const qrCodeDataUrl = await this.sharingService.generateQRCode(shareUrl);

      // Return QR code as image
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': imgBuffer.length,
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      });

      res.send(imgBuffer);

    } catch (error) {
      logger.error('Error generating QR code', {
        error: error.message,
        shareUrl: req.params.shareUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code'
      });
    }
  }

  /**
   * Get user's shared scenarios
   */
  async getUserShares(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        includeInactive = false
      } = req.query;

      logger.info('Getting user shares', {
        userId,
        page,
        limit,
        sort,
        order
      });

      const result = await this.sharingService.getUserShares(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order,
        includeInactive: includeInactive === 'true'
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error getting user shares', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get shared scenarios'
      });
    }
  }

  /**
   * Get sharing analytics
   */
  async getShareAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { dateFrom, dateTo } = req.query;

      logger.info('Getting share analytics', {
        userId,
        dateFrom,
        dateTo
      });

      const analytics = await this.sharingService.getShareAnalytics(
        userId,
        dateFrom,
        dateTo
      );

      res.json({
        success: true,
        data: { analytics }
      });

    } catch (error) {
      logger.error('Error getting share analytics', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get analytics'
      });
    }
  }

  /**
   * Get social sharing metadata for a share URL
   */
  async getSocialMetadata(req, res) {
    try {
      const { shareUrl } = req.params;

      const sharedScenario = await this.sharingService.getSharedScenario(shareUrl);

      const metadata = {
        title: sharedScenario.title || `Viễn cảnh: ${sharedScenario.scenarioData.topic}`,
        description: sharedScenario.description || 
                    sharedScenario.scenarioData.content.substring(0, 150) + '...',
        url: sharedScenario.fullShareUrl,
        image: sharedScenario.previewImage || null,
        type: 'article',
        site_name: 'What If Generator'
      };

      res.json({
        success: true,
        data: { metadata }
      });

    } catch (error) {
      logger.error('Error getting social metadata', {
        error: error.message,
        shareUrl: req.params.shareUrl
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get social metadata'
      });
    }
  }

  /**
   * Detect device type from User-Agent
   */
  detectDevice(userAgent) {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
}

module.exports = SharingController;