const express = require('express');
const router = express.Router();

// Controllers
const GenerationController = require('../controllers/generationController');

// Middleware
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');
const {
  validateGenerateScenario,
  validateRegenerate,
  validateBatchGenerate
} = require('../middleware/validation');
const {
  dynamicLimiter,
  randomScenarioLimiter,
  batchGenerationLimiter
} = require('../middleware/rateLimiter');

// Initialize controller
const generationController = new GenerationController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Scenario:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique scenario identifier
 *         topic:
 *           type: string
 *           description: The topic used to generate the scenario
 *         content:
 *           type: string
 *           description: The generated scenario content
 *         promptType:
 *           type: string
 *           enum: [default, historical, scientific, social, fantasy]
 *         provider:
 *           type: string
 *           description: AI provider used
 *         model:
 *           type: string
 *           description: AI model used
 *         tokens:
 *           type: object
 *           properties:
 *             prompt:
 *               type: number
 *             completion:
 *               type: number
 *             total:
 *               type: number
 *         generatedAt:
 *           type: string
 *           format: date-time
 *         cached:
 *           type: boolean
 *     
 *     GenerationRequest:
 *       type: object
 *       required:
 *         - topic
 *       properties:
 *         topic:
 *           type: string
 *           minLength: 3
 *           maxLength: 200
 *           description: The topic for scenario generation
 *         options:
 *           type: object
 *           properties:
 *             promptType:
 *               type: string
 *               enum: [default, historical, scientific, social, fantasy]
 *               description: Type of prompt to use
 *             temperature:
 *               type: number
 *               minimum: 0.1
 *               maximum: 2.0
 *               description: Creativity level (0.1 = conservative, 2.0 = very creative)
 *             maxTokens:
 *               type: number
 *               minimum: 100
 *               maximum: 2000
 *               description: Maximum length of generated content
 *             forceNew:
 *               type: boolean
 *               description: Force generation even if cached result exists
 *             language:
 *               type: string
 *               enum: [vi, en]
 *               default: vi
 */

/**
 * @swagger
 * /generate:
 *   post:
 *     summary: Tạo viễn cảnh mới từ chủ đề
 *     tags: [Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerationRequest'
 *           examples:
 *             simple:
 *               summary: Simple generation
 *               value:
 *                 topic: "Nếu như con người có thể bay"
 *             advanced:
 *               summary: Advanced generation with options
 *               value:
 *                 topic: "Nếu như Internet không bao giờ được phát minh"
 *                 options:
 *                   promptType: "historical"
 *                   temperature: 0.9
 *                   maxTokens: 800
 *     responses:
 *       200:
 *         description: Viễn cảnh được tạo thành công
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
 *                     scenario:
 *                       $ref: '#/components/schemas/Scenario'
 *                     userAuthenticated:
 *                       type: boolean
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       429:
 *         description: Quá nhiều requests
 *       500:
 *         description: Lỗi server
 */
router.post('/generate', 
  optionalAuth, 
  dynamicLimiter, 
  validateGenerateScenario, 
  generationController.generateScenario.bind(generationController)
);

/**
 * @swagger
 * /random:
 *   get:
 *     summary: Tạo viễn cảnh ngẫu nhiên
 *     tags: [Generation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Viễn cảnh ngẫu nhiên được tạo thành công
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
 *                     scenario:
 *                       $ref: '#/components/schemas/Scenario'
 *       429:
 *         description: Quá nhiều requests
 *       500:
 *         description: Lỗi server
 */
router.get('/random', 
  optionalAuth, 
  randomScenarioLimiter, 
  generationController.generateRandomScenario.bind(generationController)
);

/**
 * @swagger
 * /regenerate:
 *   post:
 *     summary: Tạo lại viễn cảnh với tùy chọn khác
 *     tags: [Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               previousScenarioId:
 *                 type: string
 *                 description: ID of the previous scenario being regenerated
 *               options:
 *                 type: object
 *                 properties:
 *                   promptType:
 *                     type: string
 *                     enum: [default, historical, scientific, social, fantasy]
 *                   temperature:
 *                     type: number
 *                     minimum: 0.1
 *                     maximum: 2.0
 *                   style:
 *                     type: string
 *                     enum: [creative, serious, humorous, dramatic]
 *     responses:
 *       200:
 *         description: Viễn cảnh được tạo lại thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post('/regenerate', 
  optionalAuth, 
  dynamicLimiter, 
  validateRegenerate, 
  generationController.regenerateScenario.bind(generationController)
);

/**
 * @swagger
 * /batch:
 *   post:
 *     summary: Tạo nhiều viễn cảnh cùng lúc
 *     tags: [Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topics
 *             properties:
 *               topics:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 3
 *                   maxLength: 200
 *                 minItems: 1
 *                 maxItems: 5
 *                 description: Danh sách các chủ đề
 *               options:
 *                 type: object
 *                 properties:
 *                   promptType:
 *                     type: string
 *                     enum: [default, historical, scientific, social, fantasy]
 *                   temperature:
 *                     type: number
 *                     minimum: 0.1
 *                     maximum: 2.0
 *           examples:
 *             batch_generation:
 *               summary: Batch generation example
 *               value:
 *                 topics:
 *                   - "Nếu như con người có thể bay"
 *                   - "Nếu như động vật có thể nói chuyện"
 *                   - "Nếu như thời gian có thể dừng lại"
 *                 options:
 *                   promptType: "fantasy"
 *                   temperature: 0.9
 *     responses:
 *       200:
 *         description: Các viễn cảnh được tạo thành công
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
 *                     scenarios:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Scenario'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         successful:
 *                           type: number
 *                         failed:
 *                           type: number
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       429:
 *         description: Quá nhiều requests batch
 *       500:
 *         description: Lỗi server
 */
router.post('/batch', 
  requireAuth, 
  batchGenerationLimiter, 
  validateBatchGenerate, 
  generationController.batchGenerate.bind(generationController)
);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Kiểm tra trạng thái AI provider
 *     tags: [Generation]
 *     responses:
 *       200:
 *         description: Trạng thái AI provider
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
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     provider:
 *                       type: string
 *                     model:
 *                       type: string
 *                     available:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/health', 
  generationController.getProviderHealth.bind(generationController)
);

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Lấy thống kê generation
 *     tags: [Generation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê generation
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
 *                     totalGenerated:
 *                       type: number
 *                     todayGenerated:
 *                       type: number
 *                     popularTopics:
 *                       type: array
 *                       items:
 *                         type: string
 *                     providerInfo:
 *                       type: object
 */
router.get('/stats', 
  optionalAuth, 
  generationController.getGenerationStats.bind(generationController)
);

// Admin routes
/**
 * @swagger
 * /admin/clear-cache:
 *   post:
 *     summary: Xóa cache cho chủ đề cụ thể (Admin only)
 *     tags: [Admin - Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: Chủ đề cần xóa cache
 *     responses:
 *       200:
 *         description: Cache đã được xóa
 *       403:
 *         description: Không có quyền admin
 */
router.post('/admin/clear-cache', 
  requireAuth, 
  requireAdmin, 
  generationController.clearCache.bind(generationController)
);

module.exports = router;