const express = require('express');
const router = express.Router();

// Controllers
const StoryHubController = require('../controllers/storyHubController');

// Middleware
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');

// Initialize controller
const storyHubController = new StoryHubController();

/**
 * @swagger
 * components:
 *   schemas:
 *     StoryScript:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique script identifier
 *         topic:
 *           type: string
 *           description: The original prompt/topic
 *         script:
 *           type: string
 *           description: The generated script content
 *         characters:
 *           type: array
 *           items:
 *             type: string
 *           description: List of characters in the script
 *         scenes:
 *           type: array
 *           items:
 *             type: string
 *           description: List of scenes in the script
 *         metrics:
 *           type: object
 *           properties:
 *             wordCount:
 *               type: number
 *             characterCount:
 *               type: number
 *             lineCount:
 *               type: number
 *             dialogueLines:
 *               type: number
 *             estimatedDuration:
 *               type: number
 *         creditsRemaining:
 *           type: number
 *           description: User's remaining credits
 *         generatedAt:
 *           type: string
 *           format: date-time
 *     
 *     AudioResult:
 *       type: object
 *       properties:
 *         audioUrl:
 *           type: string
 *           description: URL to the generated audio file
 *         duration:
 *           type: number
 *           description: Audio duration in seconds
 *         fileSize:
 *           type: number
 *           description: Audio file size in bytes
 *         generatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /story-hub/generate-script:
 *   post:
 *     summary: Generate detailed script with ACT structure
 *     tags: [Story Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: The story prompt/topic
 *               options:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     minimum: 0.1
 *                     maximum: 2.0
 *                   maxTokens:
 *                     type: number
 *                     minimum: 500
 *                     maximum: 3000
 *                   includeActs:
 *                     type: boolean
 *                   includeDialogue:
 *                     type: boolean
 *                   includeCharacters:
 *                     type: boolean
 *           examples:
 *             basic:
 *               summary: Basic script generation
 *               value:
 *                 prompt: "Nếu như loài chó có khả năng nói tiếng người, chuyện gì sẽ xảy ra?"
 *             advanced:
 *               summary: Advanced script generation
 *               value:
 *                 prompt: "Nếu như con người có thể bay"
 *                 options:
 *                   temperature: 0.8
 *                   maxTokens: 2000
 *                   includeActs: true
 *                   includeDialogue: true
 *     responses:
 *       200:
 *         description: Script generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StoryScript'
 *       400:
 *         description: Invalid input
 *       402:
 *         description: Insufficient credits
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/generate-script', 
  optionalAuth, 
  generalLimiter, 
  storyHubController.generateScript.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/generate-audio:
 *   post:
 *     summary: Generate audio narration from script
 *     tags: [Story Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - script
 *             properties:
 *               script:
 *                 type: string
 *                 description: The script content to convert to audio
 *               options:
 *                 type: object
 *                 properties:
 *                   voice:
 *                     type: string
 *                     enum: [professional, casual, dramatic, friendly]
 *                   speed:
 *                     type: number
 *                     minimum: 0.5
 *                     maximum: 2.0
 *                   format:
 *                     type: string
 *                     enum: [mp3, wav, ogg]
 *     responses:
 *       200:
 *         description: Audio generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AudioResult'
 *       400:
 *         description: Invalid input
 *       402:
 *         description: Premium subscription required
 *       500:
 *         description: Server error
 */
router.post('/generate-audio', 
  optionalAuth, 
  generalLimiter, 
  storyHubController.generateAudio.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/credits:
 *   get:
 *     summary: Get user's remaining credits
 *     tags: [Story Hub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User credits retrieved
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
 *                     remaining:
 *                       type: number
 *                     used:
 *                       type: number
 *                     total:
 *                       type: number
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/credits', 
  requireAuth, 
  storyHubController.getUserCredits.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/pricing:
 *   get:
 *     summary: Get available pricing plans
 *     tags: [Story Hub]
 *     responses:
 *       200:
 *         description: Pricing plans retrieved successfully
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
 *                     plans:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           price:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           features:
 *                             type: array
 *                             items:
 *                               type: string
 *       500:
 *         description: Server error
 */
router.get('/pricing', 
  storyHubController.getPricingPlans.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/upgrade:
 *   post:
 *     summary: Create premium upgrade session
 *     tags: [Story Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planName
 *             properties:
 *               planName:
 *                 type: string
 *                 enum: [basic, pro]
 *                 description: Plan name to upgrade to
 *     responses:
 *       200:
 *         description: Upgrade session created successfully
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
 *                     sessionId:
 *                       type: string
 *                     paymentUrl:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid plan name
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/upgrade', 
  requireAuth, 
  generalLimiter, 
  storyHubController.createUpgradeSession.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/verify-upgrade:
 *   post:
 *     summary: Verify payment and complete upgrade
 *     tags: [Story Hub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - paymentToken
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Payment session ID
 *               paymentToken:
 *                 type: string
 *                 description: Payment verification token
 *     responses:
 *       200:
 *         description: Upgrade completed successfully
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
 *                     userId:
 *                       type: string
 *                     planName:
 *                       type: string
 *                     upgradedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid session or token
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/verify-upgrade', 
  requireAuth, 
  generalLimiter, 
  storyHubController.verifyUpgrade.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/premium-status:
 *   get:
 *     summary: Get user's premium status
 *     tags: [Story Hub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Premium status retrieved successfully
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
 *                     hasPremium:
 *                       type: boolean
 *                     tier:
 *                       type: string
 *                     credits:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/premium-status', 
  requireAuth, 
  storyHubController.getPremiumStatus.bind(storyHubController)
);

/**
 * @swagger
 * /story-hub/health:
 *   get:
 *     summary: Health check for Story Hub service
 *     tags: [Story Hub]
 *     responses:
 *       200:
 *         description: Service is healthy
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
 *                     service:
 *                       type: string
 *                     aiProvider:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Service is unhealthy
 */
router.get('/health', 
  storyHubController.healthCheck.bind(storyHubController)
);

module.exports = router;