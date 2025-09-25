const Report = require('../models/Report');
const SharedScenario = require('../models/SharedScenario');
const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');

class ReportingService {
  /**
   * UC-011: Report inappropriate scenario
   */
  async createReport(reportData) {
    try {
      const {
        targetType,
        targetId,
        shareUrl,
        scenarioId,
        reporterId,
        reporterIP,
        reporterUserAgent,
        reason,
        description,
        category = 'content',
        severity = 'medium'
      } = reportData;

      logger.info('Creating new report', {
        targetType,
        targetId,
        reason,
        reporterId: reporterId || 'anonymous'
      });

      // Check for duplicate reports
      const existingReport = await Report.checkDuplicateReport(
        targetType,
        targetId,
        reporterId,
        reporterIP
      );

      if (existingReport) {
        logger.warn('Duplicate report detected', {
          existingReportId: existingReport._id,
          targetId,
          reporterId
        });
        
        return {
          isDuplicate: true,
          existingReport,
          message: 'You have already reported this content'
        };
      }

      // Create new report
      const report = new Report({
        targetType,
        targetId,
        shareUrl,
        scenarioId,
        reporterId,
        reporterIP,
        reporterUserAgent,
        reason,
        description,
        category,
        severity
      });

      // Calculate priority score
      report.calculatePriorityScore();

      // Auto-moderation check
      if (process.env.AUTO_MODERATE_REPORTS === 'true') {
        await this.performAutoModeration(report);
      }

      await report.save();

      // Update target's report count
      await this.updateTargetReportCount(targetType, targetId);

      // Check if immediate action needed
      await this.checkActionThreshold(targetType, targetId);

      logger.info('Report created successfully', {
        reportId: report._id,
        targetType,
        targetId,
        reason
      });

      return {
        isDuplicate: false,
        report,
        message: 'Report submitted successfully'
      };

    } catch (error) {
      logger.error('Error creating report', {
        error: error.message,
        reportData
      });
      throw error;
    }
  }

  /**
   * Get reports by target
   */
  async getReportsByTarget(targetType, targetId) {
    try {
      const reports = await Report.findReportsByTarget(targetType, targetId);
      return reports;
    } catch (error) {
      logger.error('Error getting reports by target', {
        error: error.message,
        targetType,
        targetId
      });
      throw error;
    }
  }

  /**
   * Get pending reports for moderation
   */
  async getPendingReports(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        severity,
        reason,
        category
      } = options;

      const query = { status: 'pending' };
      
      if (severity) query.severity = severity;
      if (reason) query.reason = reason;
      if (category) query.category = category;

      const sort = { priorityScore: -1, createdAt: 1 };
      const skip = (page - 1) * limit;

      const [reports, total] = await Promise.all([
        Report.find(query)
          .sort(sort)
          .limit(limit)
          .skip(skip)
          .populate('targetId'),
        Report.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        reports,
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
      logger.error('Error getting pending reports', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Review a report (moderator action)
   */
  async reviewReport(reportId, reviewerId, action, notes = null) {
    try {
      const report = await Report.findById(reportId);

      if (!report) {
        throw new Error('Report not found');
      }

      if (report.status !== 'pending') {
        throw new Error('Report has already been reviewed');
      }

      await report.markAsReviewed(reviewerId, notes);

      logger.info('Report marked as reviewed', {
        reportId,
        reviewerId,
        action
      });

      return report;

    } catch (error) {
      logger.error('Error reviewing report', {
        error: error.message,
        reportId,
        reviewerId
      });
      throw error;
    }
  }

  /**
   * Resolve a report with action
   */
  async resolveReport(reportId, action, reason = null, resolution = null) {
    try {
      const report = await Report.findById(reportId);

      if (!report) {
        throw new Error('Report not found');
      }

      await report.resolve(action, reason, resolution);

      // Execute the action on the target
      await this.executeAction(report, action, reason);

      logger.info('Report resolved', {
        reportId,
        action,
        targetType: report.targetType,
        targetId: report.targetId
      });

      return report;

    } catch (error) {
      logger.error('Error resolving report', {
        error: error.message,
        reportId,
        action
      });
      throw error;
    }
  }

  /**
   * Dismiss a report
   */
  async dismissReport(reportId, reason = null) {
    try {
      const report = await Report.findById(reportId);

      if (!report) {
        throw new Error('Report not found');
      }

      await report.dismiss(reason);

      logger.info('Report dismissed', {
        reportId,
        reason
      });

      return report;

    } catch (error) {
      logger.error('Error dismissing report', {
        error: error.message,
        reportId
      });
      throw error;
    }
  }

  /**
   * Get report statistics
   */
  async getReportStats(dateFrom = null, dateTo = null) {
    try {
      const stats = await Report.getReportStats(dateFrom, dateTo);
      return stats[0] || {
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        dismissedReports: 0
      };
    } catch (error) {
      logger.error('Error getting report stats', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform auto-moderation on report
   */
  async performAutoModeration(report) {
    try {
      // Simple auto-moderation logic
      // In production, you might use ML models or external moderation APIs

      let autoModerationScore = 0;
      const content = report.description || '';

      // Check for obvious spam patterns
      if (content.match(/https?:\/\//gi)) {
        autoModerationScore += 0.3; // URLs in reports might be spam
      }

      // Check for repeated characters (spam indicator)
      if (content.match(/(.)\1{4,}/gi)) {
        autoModerationScore += 0.4;
      }

      // Check for high-priority reasons
      const highPriorityReasons = ['violence', 'hate_speech', 'harassment'];
      if (highPriorityReasons.includes(report.reason)) {
        autoModerationScore += 0.6;
      }

      // Check for critical severity
      if (report.severity === 'critical') {
        autoModerationScore += 0.5;
      }

      report.isAutoModerated = true;
      report.autoModerationScore = Math.min(autoModerationScore, 1);

      // Auto-escalate high-scoring reports
      if (autoModerationScore >= 0.8) {
        report.status = 'escalated';
        report.severity = 'critical';
      }

      logger.info('Auto-moderation performed', {
        reportId: report._id,
        score: autoModerationScore,
        status: report.status
      });

    } catch (error) {
      logger.error('Error in auto-moderation', {
        error: error.message,
        reportId: report._id
      });
    }
  }

  /**
   * Update target's report count
   */
  async updateTargetReportCount(targetType, targetId) {
    try {
      if (targetType === 'shared_scenario') {
        const sharedScenario = await SharedScenario.findOne({ shareUrl: targetId });
        if (sharedScenario) {
          sharedScenario.reportCount += 1;
          sharedScenario.isReported = true;
          await sharedScenario.save();
        }
      }
    } catch (error) {
      logger.error('Error updating target report count', {
        error: error.message,
        targetType,
        targetId
      });
    }
  }

  /**
   * Check if action threshold is reached
   */
  async checkActionThreshold(targetType, targetId) {
    try {
      const threshold = parseInt(process.env.REPORT_THRESHOLD_FOR_HIDE) || 5;
      
      const reportCount = await Report.countDocuments({
        targetType,
        targetId,
        status: { $ne: 'dismissed' }
      });

      if (reportCount >= threshold) {
        await this.executeAutoAction(targetType, targetId, 'content_hidden');
        
        logger.warn('Auto-action triggered due to report threshold', {
          targetType,
          targetId,
          reportCount,
          threshold
        });
      }

    } catch (error) {
      logger.error('Error checking action threshold', {
        error: error.message,
        targetType,
        targetId
      });
    }
  }

  /**
   * Execute action on reported content
   */
  async executeAction(report, action, reason = null) {
    try {
      const { targetType, targetId } = report;

      switch (action) {
        case 'content_hidden':
          if (targetType === 'shared_scenario') {
            await this.hideSharedScenario(targetId, reason);
          }
          break;

        case 'content_removed':
          if (targetType === 'shared_scenario') {
            await this.removeSharedScenario(targetId, reason);
          }
          break;

        case 'warning':
          // Could send warning email to content creator
          break;

        case 'escalated_to_admin':
          await this.notifyAdmin(report);
          break;
      }

      logger.info('Action executed', {
        action,
        targetType,
        targetId,
        reportId: report._id
      });

    } catch (error) {
      logger.error('Error executing action', {
        error: error.message,
        action,
        targetType: report.targetType,
        targetId: report.targetId
      });
    }
  }

  /**
   * Execute automatic action
   */
  async executeAutoAction(targetType, targetId, action) {
    try {
      if (targetType === 'shared_scenario' && action === 'content_hidden') {
        await this.hideSharedScenario(targetId, 'Automatically hidden due to multiple reports');
      }
    } catch (error) {
      logger.error('Error executing auto action', {
        error: error.message,
        targetType,
        targetId,
        action
      });
    }
  }

  /**
   * Hide shared scenario
   */
  async hideSharedScenario(shareUrl, reason) {
    try {
      const sharedScenario = await SharedScenario.findOne({ shareUrl });
      
      if (sharedScenario) {
        sharedScenario.isHidden = true;
        sharedScenario.hiddenAt = new Date();
        sharedScenario.hiddenReason = reason;
        await sharedScenario.save();

        // Cache the hidden status for quick access
        const redis = getRedisClient();
        await redis.setEx(`hidden:${shareUrl}`, 86400, 'true'); // 24 hours cache

        logger.info('Shared scenario hidden', { shareUrl, reason });
      }
    } catch (error) {
      logger.error('Error hiding shared scenario', {
        error: error.message,
        shareUrl
      });
    }
  }

  /**
   * Remove shared scenario
   */
  async removeSharedScenario(shareUrl, reason) {
    try {
      const sharedScenario = await SharedScenario.findOne({ shareUrl });
      
      if (sharedScenario) {
        sharedScenario.isActive = false;
        sharedScenario.isHidden = true;
        sharedScenario.hiddenAt = new Date();
        sharedScenario.hiddenReason = reason;
        await sharedScenario.save();

        logger.info('Shared scenario removed', { shareUrl, reason });
      }
    } catch (error) {
      logger.error('Error removing shared scenario', {
        error: error.message,
        shareUrl
      });
    }
  }

  /**
   * Notify admin of escalated report
   */
  async notifyAdmin(report) {
    try {
      // This would typically send an email or notification to administrators
      logger.warn('Report escalated to admin', {
        reportId: report._id,
        reason: report.reason,
        severity: report.severity,
        targetType: report.targetType,
        targetId: report.targetId
      });

      // In production, you might:
      // - Send email to admin
      // - Create admin notification
      // - Post to admin Slack channel
      // - Create high-priority ticket

    } catch (error) {
      logger.error('Error notifying admin', {
        error: error.message,
        reportId: report._id
      });
    }
  }

  /**
   * Cleanup old resolved reports
   */
  async cleanupOldReports() {
    try {
      const retentionDays = 90; // Keep reports for 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await Report.deleteMany({
        status: { $in: ['resolved', 'dismissed'] },
        resolvedAt: { $lt: cutoffDate }
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old reports`);
      }

      return result.deletedCount;

    } catch (error) {
      logger.error('Error cleaning up old reports', {
        error: error.message
      });
      return 0;
    }
  }
}

module.exports = ReportingService;