const express = require('express');
const router = express.Router();
const TTSController = require('../controllers/ttsController');
const { validateRequest } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

const ttsController = new TTSController();

/**
 * @swagger
 * /tts/generate:
 *   post:
 *     summary: Generate speech from text
 *     tags: [TTS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to convert to speech
 *                 example: "Nếu như con người có thể bay, thế giới sẽ như thế nào?"
 *               options:
 *                 type: object
 *                 properties:
 *                   languageCode:
 *                     type: string
 *                     default: "vi-VN"
 *                   voiceName:
 *                     type: string
 *                     default: "vi-VN-Wavenet-A"
 *                   gender:
 *                     type: string
 *                     default: "NEUTRAL"
 *                   speakingRate:
 *                     type: number
 *                     default: 1.0
 *                   pitch:
 *                     type: number
 *                     default: 0.0
 *                   volumeGainDb:
 *                     type: number
 *                     default: 0.0
 *                   audioEncoding:
 *                     type: string
 *                     default: "MP3"
 *     responses:
 *       200:
 *         description: Speech generated successfully
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
 *                     id:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     filePath:
 *                       type: string
 *                     duration:
 *                       type: integer
 *                     audioEncoding:
 *                       type: string
 *       400:
 *         description: Bad request
 *       503:
 *         description: TTS service not available
 */
router.post('/generate', optionalAuth, async (req, res) => {
  await ttsController.generateSpeech(req, res);
});

/**
 * @swagger
 * /tts/generate-scenario:
 *   post:
 *     summary: Generate speech optimized for scenario narration
 *     tags: [TTS]
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
 *                 description: Scenario text to narrate
 *                 example: "Nếu như con người có thể bay, thế giới sẽ như thế nào?"
 *               options:
 *                 type: object
 *                 description: Additional TTS options (optional)
 *     responses:
 *       200:
 *         description: Scenario speech generated successfully
 *       400:
 *         description: Bad request
 *       503:
 *         description: TTS service not available
 */
router.post('/generate-scenario', optionalAuth, async (req, res) => {
  await ttsController.generateScenarioSpeech(req, res);
});

/**
 * @swagger
 * /tts/generate-ssml:
 *   post:
 *     summary: Generate speech with SSML markup
 *     tags: [TTS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ssml
 *             properties:
 *               ssml:
 *                 type: string
 *                 description: SSML markup for speech
 *                 example: "<speak>Xin chào, đây là <emphasis level='strong'>giọng nói</emphasis> của tôi.</speak>"
 *               options:
 *                 type: object
 *                 properties:
 *                   languageCode:
 *                     type: string
 *                     default: "vi-VN"
 *                   voiceName:
 *                     type: string
 *                     default: "vi-VN-Wavenet-A"
 *                   audioEncoding:
 *                     type: string
 *                     default: "MP3"
 *     responses:
 *       200:
 *         description: SSML speech generated successfully
 *       400:
 *         description: Bad request
 */
router.post('/generate-ssml', optionalAuth, async (req, res) => {
  await ttsController.generateSpeechWithSSML(req, res);
});

/**
 * @swagger
 * /tts/voices:
 *   get:
 *     summary: Get available voices
 *     tags: [TTS]
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *           default: "vi-VN"
 *         description: Language code to filter voices
 *     responses:
 *       200:
 *         description: Voices retrieved successfully
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
 *                     voices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           languageCode:
 *                             type: string
 *                           gender:
 *                             type: string
 *                           naturalSampleRateHertz:
 *                             type: integer
 *                     languageCode:
 *                       type: string
 *                     total:
 *                       type: integer
 *       503:
 *         description: TTS service not available
 */
router.get('/voices', async (req, res) => {
  await ttsController.getAvailableVoices(req, res);
});

/**
 * @swagger
 * /tts/download/{audioId}:
 *   get:
 *     summary: Download generated audio
 *     tags: [TTS]
 *     parameters:
 *       - in: path
 *         name: audioId
 *         required: true
 *         schema:
 *           type: string
 *         description: Audio ID
 *     responses:
 *       200:
 *         description: Audio file
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Audio file not found
 */
router.get('/download/:audioId', async (req, res) => {
  await ttsController.downloadAudio(req, res);
});

/**
 * @swagger
 * /tts/health:
 *   get:
 *     summary: Get TTS service health status
 *     tags: [TTS]
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
 *                       enum: [healthy, unhealthy, disabled]
 *                     message:
 *                       type: string
 *                     provider:
 *                       type: string
 *       503:
 *         description: Service is unhealthy
 */
router.get('/health', async (req, res) => {
  await ttsController.getHealth(req, res);
});

/**
 * @swagger
 * /tts/estimate-duration:
 *   post:
 *     summary: Estimate speech duration
 *     tags: [TTS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to estimate duration for
 *               speakingRate:
 *                 type: number
 *                 default: 1.0
 *                 description: Speaking rate multiplier
 *     responses:
 *       200:
 *         description: Duration estimated successfully
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
 *                     textLength:
 *                       type: integer
 *                     estimatedDuration:
 *                       type: integer
 *                     speakingRate:
 *                       type: number
 *                     unit:
 *                       type: string
 *       400:
 *         description: Bad request
 */
router.post('/estimate-duration', async (req, res) => {
  await ttsController.estimateDuration(req, res);
});

/**
 * @swagger
 * /tts/cleanup:
 *   post:
 *     summary: Clean up old audio files
 *     tags: [TTS]
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
  await ttsController.cleanupFiles(req, res);
});

module.exports = router;