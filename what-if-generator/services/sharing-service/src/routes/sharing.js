const express = require('express');
const router = express.Router();

// Controllers
const SharingController = require('../controllers/sharingController');

// Middleware
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Initialize controller
const sharingController = new SharingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     SharedScenario:
 *       type: object
 *       properties:
 *         shareUrl:
 *           type: string
 *           description: Unique share URL identifier
 *         shortUrl:
 *           type: string
 *           description: Shortened URL for easier sharing
 *         title:
 *           type: string
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 300
 *         scenarioData:
 *           type: object
 *           properties:
 *             topic:
 *               type: string
 *             content:
 *               type: string
 *             promptType:
 *               type: string
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 *             generatedAt:
 *               type: string
 *               format: date-time
 *         isPasswordProtected:
 *           type: boolean
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         viewCount:
 *           type: number
 *         shareCount:
 *           type: number
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /sharing/{scenarioId}:
 *   post:
 *     summary: Tạo link chia sẻ cho scenario
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của scenario cần chia sẻ
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: Tiêu đề tùy chỉnh cho share
 *               description:
 *                 type: string
 *                 maxLength: 300
 *                 description: Mô tả tùy chỉnh cho share
 *               password:
 *                 type: string
 *                 description: Mật khẩu bảo vệ (tùy chọn)
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian hết hạn (tùy chọn)
 *               forceNew:
 *                 type: boolean
 *                 description: Tạo share mới ngay cả khi đã có share cũ
 *           examples:
 *             simple:
 *               summary: Chia sẻ đơn giản
 *               value: {}
 *             with_password:
 *               summary: Chia sẻ có mật khẩu
 *               value:
 *                 title: "Viễn cảnh thú vị của tôi"
 *                 description: "Một viễn cảnh rất hay về tương lai"
 *                 password: "mypassword123"
 *             with_expiry:
 *               summary: Chia sẻ có thời hạn
 *               value:
 *                 title: "Viễn cảnh có thời hạn"
 *                 expiresAt: "2024-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Link chia sẻ được tạo thành công
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
 *                     shareUrl:
 *                       type: string
 *                     fullUrl:
 *                       type: string
 *                     shortUrl:
 *                       type: string
 *                     qrCodeUrl:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     isPasswordProtected:
 *                       type: boolean
 *       404:
 *         description: Scenario không tìm thấy hoặc không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/:scenarioId', 
  requireAuth, 
  sharingController.createShare.bind(sharingController)
);

/**
 * @swagger
 * /sharing/shared/{shareUrl}:
 *   get:
 *     summary: Lấy scenario đã được chia sẻ
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *         description: URL chia sẻ của scenario
 *       - in: query
 *         name: password
 *         schema:
 *           type: string
 *         description: Mật khẩu nếu scenario được bảo vệ
 *     responses:
 *       200:
 *         description: Scenario được chia sẻ
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
 *                     scenario:
 *                       $ref: '#/components/schemas/SharedScenario'
 *       404:
 *         description: Scenario không tìm thấy hoặc đã hết hạn
 *       401:
 *         description: Cần mật khẩu hoặc mật khẩu không đúng
 *       403:
 *         description: Scenario không thể truy cập
 */
router.get('/shared/:shareUrl', 
  sharingController.getSharedScenario.bind(sharingController)
);

/**
 * @swagger
 * /sharing/my:
 *   get:
 *     summary: Lấy danh sách scenarios đã chia sẻ của user
 *     tags: [Sharing]
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
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, viewCount, shareCount]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Danh sách scenarios đã chia sẻ
 */
router.get('/my', 
  requireAuth, 
  sharingController.getUserShares.bind(sharingController)
);

/**
 * @swagger
 * /sharing/analytics:
 *   get:
 *     summary: Lấy thống kê chia sẻ của user
 *     tags: [Sharing]
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
 *         description: Thống kê chia sẻ
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
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         totalShares:
 *                           type: number
 *                         totalViews:
 *                           type: number
 *                         totalShareEvents:
 *                           type: number
 *                         activeShares:
 *                           type: number
 *                         platformStats:
 *                           type: object
 */
router.get('/analytics', 
  requireAuth, 
  sharingController.getShareAnalytics.bind(sharingController)
);

/**
 * @swagger
 * /sharing/share/{shareUrl}:
 *   patch:
 *     summary: Cập nhật cài đặt chia sẻ
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 300
 *               password:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cài đặt được cập nhật thành công
 *       404:
 *         description: Share không tìm thấy
 */
router.patch('/share/:shareUrl', 
  requireAuth, 
  sharingController.updateShare.bind(sharingController)
);

/**
 * @swagger
 * /sharing/share/{shareUrl}:
 *   delete:
 *     summary: Xóa chia sẻ
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chia sẻ được xóa thành công
 *       404:
 *         description: Share không tìm thấy
 */
router.delete('/share/:shareUrl', 
  requireAuth, 
  sharingController.deleteShare.bind(sharingController)
);

/**
 * @swagger
 * /sharing/share/{shareUrl}/record:
 *   post:
 *     summary: Ghi nhận sự kiện chia sẻ
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [facebook, twitter, linkedin, whatsapp, telegram, email, copy, qr, other]
 *                 default: other
 *           examples:
 *             facebook:
 *               summary: Chia sẻ trên Facebook
 *               value:
 *                 platform: "facebook"
 *             copy_link:
 *               summary: Sao chép liên kết
 *               value:
 *                 platform: "copy"
 *     responses:
 *       200:
 *         description: Sự kiện chia sẻ được ghi nhận
 *       500:
 *         description: Lỗi ghi nhận sự kiện
 */
router.post('/share/:shareUrl/record', 
  sharingController.recordShare.bind(sharingController)
);

/**
 * @swagger
 * /sharing/qr/{shareUrl}:
 *   get:
 *     summary: Tạo mã QR cho link chia sẻ
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mã QR dạng hình ảnh PNG
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Lỗi tạo mã QR
 */
router.get('/qr/:shareUrl', 
  sharingController.generateQRCode.bind(sharingController)
);

/**
 * @swagger
 * /sharing/metadata/{shareUrl}:
 *   get:
 *     summary: Lấy metadata cho social media sharing
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metadata cho social sharing
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
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         url:
 *                           type: string
 *                         image:
 *                           type: string
 *                         type:
 *                           type: string
 *                         site_name:
 *                           type: string
 */
router.get('/metadata/:shareUrl', 
  sharingController.getSocialMetadata.bind(sharingController)
);

module.exports = router;