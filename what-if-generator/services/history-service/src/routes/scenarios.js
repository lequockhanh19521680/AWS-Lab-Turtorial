const express = require('express');
const router = express.Router();

// Controllers
const ScenarioController = require('../controllers/scenarioController');

// Middleware
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  validateCreateScenario,
  validateUpdateScenario,
  validateSearchScenarios,
  validatePagination,
  validateBulkUpdate
} = require('../middleware/validation');

// Initialize controller
const scenarioController = new ScenarioController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Scenario:
 *       type: object
 *       properties:
 *         scenarioId:
 *           type: string
 *           description: Unique scenario identifier
 *         userId:
 *           type: string
 *           description: ID of user who created the scenario
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
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *         isPublic:
 *           type: boolean
 *         shareUrl:
 *           type: string
 *         isFavorite:
 *           type: boolean
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         viewCount:
 *           type: number
 *         shareCount:
 *           type: number
 *         generatedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /scenarios:
 *   post:
 *     summary: Tạo scenario mới (được gọi từ generation service)
 *     tags: [Scenarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - scenarioId
 *               - topic
 *               - content
 *               - generatedAt
 *             properties:
 *               userId:
 *                 type: string
 *               scenarioId:
 *                 type: string
 *               topic:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *               promptType:
 *                 type: string
 *                 enum: [default, historical, scientific, social, fantasy]
 *               provider:
 *                 type: string
 *               model:
 *                 type: string
 *               tokens:
 *                 type: object
 *               generatedAt:
 *                 type: string
 *                 format: date-time
 *               previousScenarioId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Scenario created successfully
 *       409:
 *         description: Scenario already exists
 *       400:
 *         description: Invalid data
 */
router.post('/', 
  validateCreateScenario, 
  scenarioController.createScenario.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/my:
 *   get:
 *     summary: Lấy danh sách scenarios của user hiện tại
 *     tags: [Scenarios]
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
 *           enum: [createdAt, updatedAt, rating, viewCount]
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: promptType
 *         schema:
 *           type: string
 *           enum: [default, historical, scientific, social, fantasy]
 *       - in: query
 *         name: isFavorite
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *           description: Comma-separated list of tags
 *     responses:
 *       200:
 *         description: List of user scenarios
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
 *                     scenarios:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Scenario'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 */
router.get('/my', 
  requireAuth, 
  validatePagination, 
  scenarioController.getUserScenarios.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/search:
 *   get:
 *     summary: Tìm kiếm scenarios của user
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search term for topic, content, or tags
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *       - in: query
 *         name: promptType
 *         schema:
 *           type: string
 *           enum: [default, historical, scientific, social, fantasy]
 *       - in: query
 *         name: isFavorite
 *         schema:
 *           type: boolean
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
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', 
  requireAuth, 
  validateSearchScenarios, 
  scenarioController.searchScenarios.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/public/random:
 *   get:
 *     summary: Lấy danh sách scenarios công khai ngẫu nhiên
 *     tags: [Public Scenarios]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *     responses:
 *       200:
 *         description: Random public scenarios
 */
router.get('/public/random', 
  scenarioController.getRandomPublicScenarios.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/public/{shareUrl}:
 *   get:
 *     summary: Lấy scenario công khai theo share URL
 *     tags: [Public Scenarios]
 *     parameters:
 *       - in: path
 *         name: shareUrl
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public scenario
 *       404:
 *         description: Scenario not found
 */
router.get('/public/:shareUrl', 
  scenarioController.getPublicScenario.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/stats:
 *   get:
 *     summary: Lấy thống kê scenarios của user
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User scenario statistics
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalScenarios:
 *                           type: number
 *                         favoriteScenarios:
 *                           type: number
 *                         publicScenarios:
 *                           type: number
 *                         recentScenarios:
 *                           type: number
 *                         totalViews:
 *                           type: number
 *                         totalShares:
 *                           type: number
 *                         popularTags:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               tag:
 *                                 type: string
 *                               count:
 *                                 type: number
 */
router.get('/stats', 
  requireAuth, 
  scenarioController.getUserStats.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/bulk:
 *   patch:
 *     summary: Bulk operations on scenarios
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scenarioIds
 *               - operation
 *             properties:
 *               scenarioIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 50
 *               operation:
 *                 type: string
 *                 enum: [delete, favorite, unfavorite, makePublic, makePrivate]
 *               data:
 *                 type: object
 *                 properties:
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *           examples:
 *             bulk_delete:
 *               summary: Bulk delete scenarios
 *               value:
 *                 scenarioIds: ["scenario_123", "scenario_456"]
 *                 operation: "delete"
 *             bulk_favorite:
 *               summary: Bulk favorite scenarios
 *               value:
 *                 scenarioIds: ["scenario_123", "scenario_456"]
 *                 operation: "favorite"
 *             bulk_tag:
 *               summary: Bulk add tags
 *               value:
 *                 scenarioIds: ["scenario_123"]
 *                 operation: "favorite"
 *                 data:
 *                   tags: ["thú vị", "sáng tạo"]
 *     responses:
 *       200:
 *         description: Bulk operation completed
 */
router.patch('/bulk', 
  requireAuth, 
  validateBulkUpdate, 
  scenarioController.bulkUpdate.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/{scenarioId}:
 *   get:
 *     summary: Lấy chi tiết một scenario
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario details
 *       404:
 *         description: Scenario not found
 *       403:
 *         description: Access denied
 */
router.get('/:scenarioId', 
  optionalAuth, 
  scenarioController.getScenarioById.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/{scenarioId}:
 *   patch:
 *     summary: Cập nhật scenario (tags, favorite, public, rating)
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 30
 *                 maxItems: 10
 *               isFavorite:
 *                 type: boolean
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               isPublic:
 *                 type: boolean
 *           examples:
 *             add_tags:
 *               summary: Add tags to scenario
 *               value:
 *                 tags: ["thú vị", "sáng tạo", "khoa học"]
 *             mark_favorite:
 *               summary: Mark as favorite
 *               value:
 *                 isFavorite: true
 *             rate_scenario:
 *               summary: Rate scenario
 *               value:
 *                 rating: 5
 *             make_public:
 *               summary: Make scenario public
 *               value:
 *                 isPublic: true
 *     responses:
 *       200:
 *         description: Scenario updated successfully
 *       404:
 *         description: Scenario not found
 *       400:
 *         description: Invalid data
 */
router.patch('/:scenarioId', 
  requireAuth, 
  validateUpdateScenario, 
  scenarioController.updateScenario.bind(scenarioController)
);

/**
 * @swagger
 * /scenarios/{scenarioId}:
 *   delete:
 *     summary: Xóa scenario khỏi lịch sử
 *     tags: [Scenarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario deleted successfully
 *       404:
 *         description: Scenario not found
 */
router.delete('/:scenarioId', 
  requireAuth, 
  scenarioController.deleteScenario.bind(scenarioController)
);

module.exports = router;