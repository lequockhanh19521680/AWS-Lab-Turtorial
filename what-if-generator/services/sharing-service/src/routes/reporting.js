const express = require('express');
const router = express.Router();

// Controllers
const ReportingController = require('../controllers/reportingController');

// Middleware
const { requireAuth, optionalAuth, requireAdmin, requireModerator } = require('../middleware/auth');

// Initialize controller
const reportingController = new ReportingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         targetType:
 *           type: string
 *           enum: [scenario, shared_scenario]
 *         targetId:
 *           type: string
 *         shareUrl:
 *           type: string
 *         scenarioId:
 *           type: string
 *         reporterId:
 *           type: string
 *         reason:
 *           type: string
 *           enum: [inappropriate_content, spam, harassment, violence, hate_speech, adult_content, misinformation, copyright_violation, other]
 *         description:
 *           type: string
 *           maxLength: 500
 *         category:
 *           type: string
 *           enum: [content, behavior, technical, legal]
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         status:
 *           type: string
 *           enum: [pending, under_review, resolved, dismissed, escalated]
 *         actionTaken:
 *           type: string
 *           enum: [none, warning, content_hidden, content_removed, user_warned, user_suspended, user_banned, escalated_to_admin]
 *         priorityScore:
 *           type: number
 *         isAutoModerated:
 *           type: boolean
 *         autoModerationScore:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *         resolvedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /reporting/report:
 *   post:
 *     summary: Báo cáo nội dung không phù hợp
 *     tags: [Reporting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetType
 *               - targetId
 *               - scenarioId
 *               - reason
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [scenario, shared_scenario]
 *                 description: Loại đối tượng bị báo cáo
 *               targetId:
 *                 type: string
 *                 description: ID của đối tượng bị báo cáo
 *               shareUrl:
 *                 type: string
 *                 description: Share URL nếu báo cáo shared scenario
 *               scenarioId:
 *                 type: string
 *                 description: ID của scenario gốc
 *               reason:
 *                 type: string
 *                 enum: [inappropriate_content, spam, harassment, violence, hate_speech, adult_content, misinformation, copyright_violation, other]
 *                 description: Lý do báo cáo
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Mô tả chi tiết (tùy chọn)
 *               category:
 *                 type: string
 *                 enum: [content, behavior, technical, legal]
 *                 default: content
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *           examples:
 *             inappropriate_content:
 *               summary: Báo cáo nội dung không phù hợp
 *               value:
 *                 targetType: "shared_scenario"
 *                 targetId: "abc123-def456"
 *                 shareUrl: "abc123-def456"
 *                 scenarioId: "scenario_789"
 *                 reason: "inappropriate_content"
 *                 description: "Nội dung chứa ngôn từ không phù hợp"
 *                 category: "content"
 *                 severity: "medium"
 *             spam:
 *               summary: Báo cáo spam
 *               value:
 *                 targetType: "scenario"
 *                 targetId: "scenario_123"
 *                 scenarioId: "scenario_123"
 *                 reason: "spam"
 *                 description: "Nội dung spam, quảng cáo"
 *                 severity: "low"
 *     responses:
 *       201:
 *         description: Báo cáo được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     priorityScore:
 *                       type: number
 *       409:
 *         description: Báo cáo trùng lặp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isDuplicate:
 *                       type: boolean
 *                     existingReportId:
 *                       type: string
 *       500:
 *         description: Lỗi server
 */
router.post('/report', 
  optionalAuth, 
  reportingController.createReport.bind(reportingController)
);

/**
 * @swagger
 * /reporting/options:
 *   get:
 *     summary: Lấy danh sách các tùy chọn báo cáo
 *     tags: [Reporting]
 *     responses:
 *       200:
 *         description: Danh sách tùy chọn báo cáo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     options:
 *                       type: object
 *                       properties:
 *                         reasons:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               value:
 *                                 type: string
 *                               label:
 *                                 type: string
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               value:
 *                                 type: string
 *                               label:
 *                                 type: string
 *                         severities:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               value:
 *                                 type: string
 *                               label:
 *                                 type: string
 */
router.get('/options', 
  reportingController.getReportOptions.bind(reportingController)
);

// Admin/Moderator routes
/**
 * @swagger
 * /reporting/pending:
 *   get:
 *     summary: Lấy danh sách báo cáo đang chờ xử lý (Admin/Moderator only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [content, behavior, technical, legal]
 *     responses:
 *       200:
 *         description: Danh sách báo cáo pending
 *       403:
 *         description: Không có quyền admin/moderator
 */
router.get('/pending', 
  requireAuth, 
  requireModerator, 
  reportingController.getPendingReports.bind(reportingController)
);

/**
 * @swagger
 * /reporting/stats:
 *   get:
 *     summary: Lấy thống kê báo cáo (Admin only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thống kê báo cáo
 *       403:
 *         description: Không có quyền admin
 */
router.get('/stats', 
  requireAuth, 
  requireAdmin, 
  reportingController.getReportStats.bind(reportingController)
);

/**
 * @swagger
 * /reporting/{reportId}:
 *   get:
 *     summary: Lấy chi tiết báo cáo (Admin/Moderator only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết báo cáo
 *       404:
 *         description: Báo cáo không tìm thấy
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/:reportId', 
  requireAuth, 
  requireModerator, 
  reportingController.getReportById.bind(reportingController)
);

/**
 * @swagger
 * /reporting/{reportId}/review:
 *   patch:
 *     summary: Đánh dấu báo cáo đã xem xét (Admin/Moderator only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Ghi chú của moderator
 *     responses:
 *       200:
 *         description: Báo cáo đã được đánh dấu là đã xem xét
 *       404:
 *         description: Báo cáo không tìm thấy
 *       400:
 *         description: Báo cáo đã được xem xét trước đó
 */
router.patch('/:reportId/review', 
  requireAuth, 
  requireModerator, 
  reportingController.reviewReport.bind(reportingController)
);

/**
 * @swagger
 * /reporting/{reportId}/resolve:
 *   patch:
 *     summary: Giải quyết báo cáo với hành động cụ thể (Admin/Moderator only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [none, warning, content_hidden, content_removed, user_warned, user_suspended, user_banned, escalated_to_admin]
 *                 description: Hành động thực hiện
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do thực hiện hành động
 *               resolution:
 *                 type: string
 *                 maxLength: 500
 *                 description: Mô tả giải quyết
 *           examples:
 *             hide_content:
 *               summary: Ẩn nội dung
 *               value:
 *                 action: "content_hidden"
 *                 reason: "Nội dung không phù hợp với cộng đồng"
 *                 resolution: "Đã ẩn nội dung và gửi cảnh báo cho người dùng"
 *             dismiss:
 *               summary: Không hành động
 *               value:
 *                 action: "none"
 *                 reason: "Nội dung được báo cáo không vi phạm quy định"
 *                 resolution: "Báo cáo không hợp lệ"
 *     responses:
 *       200:
 *         description: Báo cáo đã được giải quyết
 *       404:
 *         description: Báo cáo không tìm thấy
 */
router.patch('/:reportId/resolve', 
  requireAuth, 
  requireModerator, 
  reportingController.resolveReport.bind(reportingController)
);

/**
 * @swagger
 * /reporting/{reportId}/dismiss:
 *   patch:
 *     summary: Bác bỏ báo cáo (Admin/Moderator only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do bác bỏ báo cáo
 *     responses:
 *       200:
 *         description: Báo cáo đã được bác bỏ
 *       404:
 *         description: Báo cáo không tìm thấy
 */
router.patch('/:reportId/dismiss', 
  requireAuth, 
  requireModerator, 
  reportingController.dismissReport.bind(reportingController)
);

/**
 * @swagger
 * /reporting/target/{targetType}/{targetId}:
 *   get:
 *     summary: Lấy tất cả báo cáo cho một đối tượng cụ thể (Admin only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [scenario, shared_scenario]
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách báo cáo cho đối tượng
 *       403:
 *         description: Không có quyền admin
 */
router.get('/target/:targetType/:targetId', 
  requireAuth, 
  requireAdmin, 
  reportingController.getReportsByTarget.bind(reportingController)
);

/**
 * @swagger
 * /reporting/bulk/resolve:
 *   patch:
 *     summary: Giải quyết nhiều báo cáo cùng lúc (Admin only)
 *     tags: [Admin - Reporting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportIds
 *               - action
 *             properties:
 *               reportIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Danh sách ID báo cáo cần giải quyết
 *               action:
 *                 type: string
 *                 enum: [none, warning, content_hidden, content_removed, user_warned, user_suspended, user_banned, escalated_to_admin]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *           examples:
 *             bulk_hide:
 *               summary: Ẩn nhiều nội dung
 *               value:
 *                 reportIds: ["report1", "report2", "report3"]
 *                 action: "content_hidden"
 *                 reason: "Nội dung vi phạm quy định cộng đồng"
 *     responses:
 *       200:
 *         description: Kết quả giải quyết hàng loạt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     resolved:
 *                       type: array
 *                     errors:
 *                       type: array
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         successful:
 *                           type: number
 *                         failed:
 *                           type: number
 *       403:
 *         description: Không có quyền admin
 */
router.patch('/bulk/resolve', 
  requireAuth, 
  requireAdmin, 
  reportingController.bulkResolveReports.bind(reportingController)
);

module.exports = router;