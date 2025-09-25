const AIService = require('../services/aiService');
const PremiumService = require('../services/premiumService');
const { 
  generateStoryScript, 
  postProcessScript, 
  extractCharacters, 
  extractScenes, 
  calculateScriptMetrics 
} = require('../prompts/storyHubPrompts');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

class StoryHubController {
  constructor() {
    this.aiService = new AIService();
    this.premiumService = new PremiumService();
  }

  /**
   * Generate detailed script with ACT structure
   */
  async generateScript(req, res) {
    try {
      const { prompt, options = {} } = req.body;
      const userId = req.user?.id;

      // Input validation
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required and must be a non-empty string'
        });
      }

      if (prompt.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is too long (maximum 500 characters)'
        });
      }

      const cleanPrompt = prompt.trim();

      // Check user credits (if authenticated)
      if (userId) {
        const credits = await this.getUserCredits(userId);
        if (credits.remaining <= 0) {
          return res.status(402).json({
            success: false,
            message: 'Insufficient credits. Please upgrade to continue.',
            credits: credits
          });
        }
      }

      // Check cache first
      const cacheKey = `story_script:${Buffer.from(cleanPrompt).toString('base64')}`;
      const cachedResult = await this.getCachedScript(cacheKey);
      
      if (cachedResult && !options.forceNew) {
        logger.info('Returning cached script', { prompt: cleanPrompt });
        return res.json({
          success: true,
          data: {
            ...cachedResult,
            cached: true
          }
        });
      }

      // Generate script using Story Hub prompts
      const scriptPrompt = generateStoryScript(cleanPrompt, options);
      
      logger.info('Starting script generation', {
        prompt: cleanPrompt,
        userId: userId,
        options: options
      });

      // Generate script with timeout
      const timeoutMs = process.env.SCRIPT_TIMEOUT_MS || 45000;
      const result = await Promise.race([
        this.aiService.provider.generateScenario(
          scriptPrompt.systemPrompt,
          scriptPrompt.userPrompt,
          scriptPrompt.options
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Script generation timeout')), timeoutMs)
        )
      ]);

      // Post-process the script
      const processedScript = postProcessScript(result.content);
      
      // Extract metadata
      const characters = extractCharacters(processedScript);
      const scenes = extractScenes(processedScript);
      const metrics = calculateScriptMetrics(processedScript);

      // Prepare final result
      const script = {
        id: this.generateScriptId(),
        topic: cleanPrompt,
        script: processedScript,
        characters: characters,
        scenes: scenes,
        metrics: metrics,
        promptType: 'storyScript',
        provider: result.provider,
        model: result.model,
        tokens: result.tokens,
        generatedAt: new Date().toISOString(),
        cached: false
      };

      // Cache the result
      await this.cacheScript(cacheKey, script);

      // Deduct credits if user is authenticated
      if (userId) {
        await this.deductUserCredits(userId, 1);
        const updatedCredits = await this.getUserCredits(userId);
        script.creditsRemaining = updatedCredits.remaining;
      } else {
        script.creditsRemaining = 10; // Default for anonymous users
      }

      logger.info('Script generated successfully', {
        scriptId: script.id,
        prompt: cleanPrompt,
        wordCount: metrics.wordCount,
        characters: characters.length,
        userId: userId
      });

      res.json({
        success: true,
        data: script
      });

    } catch (error) {
      logger.error('Script generation failed', {
        error: error.message,
        prompt: req.body.prompt,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Script generation failed'
      });
    }
  }

  /**
   * Generate audio narration from script
   */
  async generateAudio(req, res) {
    try {
      const { script, options = {} } = req.body;
      const userId = req.user?.id;

      if (!script || typeof script !== 'string' || script.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Script is required for audio generation'
        });
      }

      // Check if user has premium access for audio generation
      if (userId) {
        const userTier = await this.getUserTier(userId);
        if (userTier === 'free') {
          return res.status(402).json({
            success: false,
            message: 'Audio generation requires premium subscription'
          });
        }
      }

      // Call TTS service to generate audio
      const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://localhost:3005';
      const ttsResponse = await this.callTTSService(ttsServiceUrl, script, options);

      if (!ttsResponse.success) {
        throw new Error(ttsResponse.message || 'TTS service failed');
      }

      const audioResult = {
        audioUrl: ttsResponse.data.filePath,
        duration: ttsResponse.data.duration,
        fileSize: ttsResponse.data.fileSize || 0,
        generatedAt: new Date().toISOString()
      };

      logger.info('Audio generation completed', {
        scriptLength: script.length,
        userId: userId,
        duration: audioResult.duration,
        audioUrl: audioResult.audioUrl
      });

      res.json({
        success: true,
        data: audioResult
      });

    } catch (error) {
      logger.error('Audio generation failed', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Audio generation failed'
      });
    }
  }

  /**
   * Call TTS service to generate audio
   */
  async callTTSService(ttsServiceUrl, script, options = {}) {
    try {
      const axios = require('axios');
      
      const ttsOptions = {
        languageCode: 'vi-VN',
        voiceName: 'vi-VN-Wavenet-A',
        gender: 'NEUTRAL',
        speakingRate: options.speed || 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
        audioEncoding: 'MP3',
        ...options
      };

      const response = await axios.post(`${ttsServiceUrl}/tts/generate-scenario`, {
        scenarioText: script,
        options: ttsOptions
      }, {
        timeout: 60000, // 1 minute timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('TTS service call failed', {
        error: error.message,
        ttsServiceUrl,
        scriptLength: script.length
      });
      
      // Return a fallback response
      return {
        success: false,
        message: 'TTS service unavailable',
        error: error.message
      };
    }
  }

  /**
   * Get user credits
   */
  async getUserCredits(userId) {
    try {
      const redis = getRedisClient();
      const creditsKey = `user_credits:${userId}`;
      const credits = await redis.get(creditsKey);
      
      if (credits) {
        return JSON.parse(credits);
      }
      
      // Default credits for new users
      const defaultCredits = { remaining: 10, used: 0, total: 10 };
      await redis.setEx(creditsKey, 86400 * 30, JSON.stringify(defaultCredits)); // 30 days
      return defaultCredits;
    } catch (error) {
      logger.warn('Failed to get user credits', { error: error.message, userId });
      return { remaining: 10, used: 0, total: 10 };
    }
  }

  /**
   * Deduct user credits
   */
  async deductUserCredits(userId, amount) {
    try {
      const redis = getRedisClient();
      const creditsKey = `user_credits:${userId}`;
      const credits = await this.getUserCredits(userId);
      
      credits.remaining = Math.max(0, credits.remaining - amount);
      credits.used += amount;
      
      await redis.setEx(creditsKey, 86400 * 30, JSON.stringify(credits));
      
      logger.info('Credits deducted', { userId, amount, remaining: credits.remaining });
    } catch (error) {
      logger.warn('Failed to deduct credits', { error: error.message, userId });
    }
  }

  /**
   * Get user subscription tier
   */
  async getUserTier(userId) {
    try {
      const redis = getRedisClient();
      const tierKey = `user_tier:${userId}`;
      const tier = await redis.get(tierKey);
      return tier || 'free';
    } catch (error) {
      logger.warn('Failed to get user tier', { error: error.message, userId });
      return 'free';
    }
  }

  /**
   * Cache script result
   */
  async cacheScript(cacheKey, script) {
    try {
      const redis = getRedisClient();
      const cacheValue = JSON.stringify(script);
      await redis.setEx(cacheKey, 3600, cacheValue); // 1 hour cache
      logger.debug('Script cached', { cacheKey });
    } catch (error) {
      logger.warn('Failed to cache script', { error: error.message });
    }
  }

  /**
   * Get cached script
   */
  async getCachedScript(cacheKey) {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Failed to get cached script', { error: error.message });
      return null;
    }
  }

  /**
   * Generate unique script ID
   */
  generateScriptId() {
    return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique audio ID
   */
  generateAudioId() {
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pricing plans
   */
  async getPricingPlans(req, res) {
    try {
      const plans = this.premiumService.getPricingPlans();
      
      res.json({
        success: true,
        data: {
          plans: Object.entries(plans).map(([key, plan]) => ({
            id: key,
            ...plan
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to get pricing plans', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get pricing plans'
      });
    }
  }

  /**
   * Create premium upgrade session
   */
  async createUpgradeSession(req, res) {
    try {
      const { planName } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!planName) {
        return res.status(400).json({
          success: false,
          message: 'Plan name is required'
        });
      }

      const session = await this.premiumService.createPaymentSession(userId, planName);
      
      res.json({
        success: true,
        data: session
      });

    } catch (error) {
      logger.error('Failed to create upgrade session', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create upgrade session'
      });
    }
  }

  /**
   * Verify payment and complete upgrade
   */
  async verifyUpgrade(req, res) {
    try {
      const { sessionId, paymentToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!sessionId || !paymentToken) {
        return res.status(400).json({
          success: false,
          message: 'Session ID and payment token are required'
        });
      }

      const result = await this.premiumService.verifyPayment(sessionId, paymentToken);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to verify upgrade', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify upgrade'
      });
    }
  }

  /**
   * Get user's premium status
   */
  async getPremiumStatus(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPremium = await this.premiumService.hasPremiumAccess(userId);
      const tier = await this.premiumService.getUserTier(userId);
      const credits = await this.getUserCredits(userId);

      res.json({
        success: true,
        data: {
          hasPremium,
          tier,
          credits
        }
      });

    } catch (error) {
      logger.error('Failed to get premium status', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get premium status'
      });
    }
  }

  /**
   * Health check for Story Hub
   */
  async healthCheck(req, res) {
    try {
      const aiHealth = await this.aiService.healthCheck();
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          service: 'story-hub',
          aiProvider: aiHealth,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Story Hub health check failed',
        error: error.message
      });
    }
  }
}

module.exports = StoryHubController;