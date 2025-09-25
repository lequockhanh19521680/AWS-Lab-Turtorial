const express = require('express');
const router = express.Router();
const VideoController = require('../controllers/videoController');
const { validateRequest } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

const videoController = new VideoController();

/**
 * @swagger
 * /video/generate:
 *   post:
 *     summary: Generate video with narration from scenario
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scenarioText
 *             properties:
 *               scenarioText:
 *                 type: string
 *                 description: The scenario text to narrate
 *                 example: "Nếu như con người có thể bay, thế giới sẽ như thế nào?"
 *               prompt:
 *                 type: string
 *                 description: Custom video generation prompt (optional)
 *               videoOptions:
 *                 type: object
 *                 properties:
 *                   duration:
 *                     type: integer
 *                     default: 10
 *                   resolution:
 *                     type: string
 *                     default: "1280x720"
 *                   style:
 *                     type: string
 *                     default: "cinematic"
 *                   fps:
 *                     type: integer
 *                     default: 24
 *               ttsOptions:
 *                 type: object
 *                 properties:
 *                   voiceName:
 *                     type: string
 *                     default: "vi-VN-Wavenet-A"
 *                   speakingRate:
 *                     type: number
 *                     default: 0.9
 *                   pitch:
 *                     type: number
 *                     default: -2.0
 *     responses:
 *       200:
 *         description: Video with narration generated successfully
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
 *                     jobId:
 *                       type: string
 *                     video:
 *                       type: object
 *                     audio:
 *                       type: object
 *                     combined:
 *                       type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/generate', optionalAuth, async (req, res) => {
  await videoController.generateVideoWithNarration(req, res);
});

/**
 * @swagger
 * /video/generate-video-only:
 *   post:
 *     summary: Generate video only (without TTS)
 *     tags: [Video]
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
 *                 description: Video generation prompt
 *                 example: "Create a cinematic 3D animation of flying humans in a futuristic city"
 *               options:
 *                 type: object
 *                 properties:
 *                   duration:
 *                     type: integer
 *                     default: 10
 *                   resolution:
 *                     type: string
 *                     default: "1280x720"
 *                   style:
 *                     type: string
 *                     default: "cinematic"
 *     responses:
 *       200:
 *         description: Video generated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/generate-video-only', optionalAuth, async (req, res) => {
  await videoController.generateVideo(req, res);
});

/**
 * @swagger
 * /video/status/{jobId}:
 *   get:
 *     summary: Get video generation status
 *     tags: [Video]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Status retrieved successfully
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
 *                     jobId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [completed, processing, failed]
 *                     progress:
 *                       type: integer
 *       404:
 *         description: Job not found
 */
router.get('/status/:jobId', async (req, res) => {
  await videoController.getVideoStatus(req, res);
});

/**
 * @swagger
 * /video/download/{jobId}:
 *   get:
 *     summary: Download generated video
 *     tags: [Video]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Video file
 *         content:
 *           video/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Video not found
 */
router.get('/download/:jobId', async (req, res) => {
  await videoController.downloadVideo(req, res);
});

/**
 * @swagger
 * /video/providers:
 *   get:
 *     summary: Get video generation provider status
 *     tags: [Video]
 *     responses:
 *       200:
 *         description: Provider status retrieved successfully
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
 *                     activeProvider:
 *                       type: string
 *                     providers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           enabled:
 *                             type: boolean
 *                           configured:
 *                             type: boolean
 */
router.get('/providers', async (req, res) => {
  await videoController.getProviderStatus(req, res);
});

/**
 * @swagger
 * /video/cleanup:
 *   post:
 *     summary: Clean up old video files
 *     tags: [Video]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAgeHours:
 *                 type: integer
 *                 default: 24
 *                 description: Maximum age of files to keep (in hours)
 *     responses:
 *       200:
 *         description: Files cleaned up successfully
 */
router.post('/cleanup', async (req, res) => {
  await videoController.cleanupFiles(req, res);
});

module.exports = router;