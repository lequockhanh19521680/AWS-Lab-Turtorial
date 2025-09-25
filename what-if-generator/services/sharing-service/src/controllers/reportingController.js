const ReportingService = require('../services/reportingService');
const logger = require('../config/logger');

class ReportingController {
  constructor() {
    this.reportingService = new ReportingService();
  }

  /**
   * UC-011: Report inappropriate scenario
   */
  async createReport(req, res) {
    try {
      const {
        targetType,
        targetId,
        shareUrl,
        scenarioId,
        reason,
        description,
        category,
        severity
      } = req.body;

      const reporterId = req.user?.id || null;
      const reporterIP = req.ip || req.connection.remoteAddress;
      const reporterUserAgent = req.get('User-Agent');

      logger.info('Creating report', {
        targetType,
        targetId,
        reason,
        reporterId: reporterId || 'anonymous'
      });

      const reportData = {
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
      };

      const result = await this.reportingService.createReport(reportData);

      if (result.isDuplicate) {
        return res.status(409).json({
          success: false,
          message: result.message,
          data: {
            isDuplicate: true,
            existingReportId: result.existingReport._id
          }
        });
      }

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          reportId: result.report._id,
          status: result.report.status,
          priorityScore: result.report.priorityScore
        }
      });

    } catch (error) {
      logger.error('Error creating report', {
        error: error.message,
        reportData: req.body
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create report'
      });
    }
  }

  /**
   * Get reports by target (admin only)
   */
  async getReportsByTarget(req, res) {
    try {
      const { targetType, targetId } = req.params;

      logger.info('Getting reports by target', {
        targetType,
        targetId,
        adminId: req.user.id
      });

      const reports = await this.reportingService.getReportsByTarget(
        targetType,
        targetId
      );

      res.json({
        success: true,
        data: { reports }
      });

    } catch (error) {
      logger.error('Error getting reports by target', {
        error: error.message,
        targetType: req.params.targetType,
        targetId: req.params.targetId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get reports'
      });
    }
  }

  /**
   * Get pending reports for moderation (admin only)
   */
  async getPendingReports(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        severity,
        reason,
        category
      } = req.query;

      logger.info('Getting pending reports', {
        page,
        limit,
        severity,
        reason,
        category,
        adminId: req.user.id
      });

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        severity,
        reason,
        category
      };

      const result = await this.reportingService.getPendingReports(options);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error getting pending reports', {
        error: error.message,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get pending reports'
      });
    }
  }

  /**
   * Review a report (admin only)
   */
  async reviewReport(req, res) {
    try {
      const { reportId } = req.params;
      const { notes } = req.body;
      const reviewerId = req.user.id;

      logger.info('Reviewing report', {
        reportId,
        reviewerId,
        notes
      });

      const report = await this.reportingService.reviewReport(
        reportId,
        reviewerId,
        'review',
        notes
      );

      res.json({
        success: true,
        message: 'Report marked as reviewed',
        data: {
          reportId: report._id,
          status: report.status,
          reviewedAt: report.reviewedAt
        }
      });

    } catch (error) {
      logger.error('Error reviewing report', {
        error: error.message,
        reportId: req.params.reportId,
        reviewerId: req.user?.id
      });

      let statusCode = 500;
      let message = 'Failed to review report';

      if (error.message.includes('not found')) {
        statusCode = 404;
        message = 'Report not found';
      } else if (error.message.includes('already been reviewed')) {
        statusCode = 400;
        message = 'Report has already been reviewed';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Resolve a report with action (admin only)
   */
  async resolveReport(req, res) {
    try {
      const { reportId } = req.params;
      const { action, reason, resolution } = req.body;

      logger.info('Resolving report', {
        reportId,
        action,
        reason,
        adminId: req.user.id
      });

      const report = await this.reportingService.resolveReport(
        reportId,
        action,
        reason,
        resolution
      );

      res.json({
        success: true,
        message: 'Report resolved successfully',
        data: {
          reportId: report._id,
          status: report.status,
          actionTaken: report.actionTaken,
          resolvedAt: report.resolvedAt
        }
      });

    } catch (error) {
      logger.error('Error resolving report', {
        error: error.message,
        reportId: req.params.reportId,
        adminId: req.user?.id
      });

      let statusCode = 500;
      let message = 'Failed to resolve report';

      if (error.message.includes('not found')) {
        statusCode = 404;
        message = 'Report not found';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Dismiss a report (admin only)
   */
  async dismissReport(req, res) {
    try {
      const { reportId } = req.params;
      const { reason } = req.body;

      logger.info('Dismissing report', {
        reportId,
        reason,
        adminId: req.user.id
      });

      const report = await this.reportingService.dismissReport(reportId, reason);

      res.json({
        success: true,
        message: 'Report dismissed successfully',
        data: {
          reportId: report._id,
          status: report.status,
          resolvedAt: report.resolvedAt
        }
      });

    } catch (error) {
      logger.error('Error dismissing report', {
        error: error.message,
        reportId: req.params.reportId,
        adminId: req.user?.id
      });

      let statusCode = 500;
      let message = 'Failed to dismiss report';

      if (error.message.includes('not found')) {
        statusCode = 404;
        message = 'Report not found';
      }

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  /**
   * Get report statistics (admin only)
   */
  async getReportStats(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      logger.info('Getting report statistics', {
        dateFrom,
        dateTo,
        adminId: req.user.id
      });

      const stats = await this.reportingService.getReportStats(dateFrom, dateTo);

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Error getting report stats', {
        error: error.message,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get report statistics'
      });
    }
  }

  /**
   * Get report details by ID (admin only)
   */
  async getReportById(req, res) {
    try {
      const { reportId } = req.params;

      logger.info('Getting report by ID', {
        reportId,
        adminId: req.user.id
      });

      const Report = require('../models/Report');
      const report = await Report.findById(reportId);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      res.json({
        success: true,
        data: { report }
      });

    } catch (error) {
      logger.error('Error getting report by ID', {
        error: error.message,
        reportId: req.params.reportId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get report'
      });
    }
  }

  /**
   * Bulk resolve reports (admin only)
   */
  async bulkResolveReports(req, res) {
    try {
      const { reportIds, action, reason } = req.body;
      const adminId = req.user.id;

      logger.info('Bulk resolving reports', {
        reportCount: reportIds.length,
        action,
        adminId
      });

      const results = [];
      const errors = [];

      for (const reportId of reportIds) {
        try {
          const report = await this.reportingService.resolveReport(
            reportId,
            action,
            reason
          );
          results.push({
            reportId,
            status: 'resolved',
            resolvedAt: report.resolvedAt
          });
        } catch (error) {
          errors.push({
            reportId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk resolved ${results.length}/${reportIds.length} reports`,
        data: {
          resolved: results,
          errors,
          summary: {
            total: reportIds.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      logger.error('Error bulk resolving reports', {
        error: error.message,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to bulk resolve reports'
      });
    }
  }

  /**
   * Get report reasons and categories (for frontend dropdowns)
   */
  async getReportOptions(req, res) {
    try {
      const options = {
        reasons: [
          { value: 'inappropriate_content', label: 'Nội dung không phù hợp' },
          { value: 'spam', label: 'Spam' },
          { value: 'harassment', label: 'Quấy rối' },
          { value: 'violence', label: 'Bạo lực' },
          { value: 'hate_speech', label: 'Ngôn từ thù hận' },
          { value: 'adult_content', label: 'Nội dung người lớn' },
          { value: 'misinformation', label: 'Thông tin sai lệch' },
          { value: 'copyright_violation', label: 'Vi phạm bản quyền' },
          { value: 'other', label: 'Khác' }
        ],
        categories: [
          { value: 'content', label: 'Nội dung' },
          { value: 'behavior', label: 'Hành vi' },
          { value: 'technical', label: 'Kỹ thuật' },
          { value: 'legal', label: 'Pháp lý' }
        ],
        severities: [
          { value: 'low', label: 'Thấp' },
          { value: 'medium', label: 'Trung bình' },
          { value: 'high', label: 'Cao' },
          { value: 'critical', label: 'Nguy hiểm' }
        ],
        actions: [
          { value: 'none', label: 'Không hành động' },
          { value: 'warning', label: 'Cảnh báo' },
          { value: 'content_hidden', label: 'Ẩn nội dung' },
          { value: 'content_removed', label: 'Xóa nội dung' },
          { value: 'user_warned', label: 'Cảnh báo người dùng' },
          { value: 'user_suspended', label: 'Đình chỉ người dùng' },
          { value: 'user_banned', label: 'Cấm người dùng' },
          { value: 'escalated_to_admin', label: 'Chuyển lên quản trị viên' }
        ]
      };

      res.json({
        success: true,
        data: { options }
      });

    } catch (error) {
      logger.error('Error getting report options', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get report options'
      });
    }
  }
}

module.exports = ReportingController;