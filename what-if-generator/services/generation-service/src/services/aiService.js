const GeminiProvider = require('./aiProviders/geminiProvider');
const OpenAIProvider = require('./aiProviders/openaiProvider');
const AnthropicProvider = require('./aiProviders/anthropicProvider');
const { getPromptForTopic, SAFETY_PROMPT } = require('../prompts/scenarioPrompts');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.provider = null;
    this.initializeProvider();
  }

  initializeProvider() {
    const providerType = process.env.AI_PROVIDER || 'gemini';
    
    try {
      switch (providerType.toLowerCase()) {
        case 'gemini':
          this.provider = new GeminiProvider();
          break;
        case 'openai':
          this.provider = new OpenAIProvider();
          break;
        case 'anthropic':
          this.provider = new AnthropicProvider();
          break;
        default:
          throw new Error(`Unsupported AI provider: ${providerType}`);
      }
      
      logger.info(`AI Service initialized with provider: ${providerType}`);
    } catch (error) {
      logger.error('Failed to initialize AI provider', { error: error.message });
      throw error;
    }
  }

  /**
   * UC-001: Generate a scenario based on topic
   */
  async generateScenario(topic, options = {}) {
    try {
      // Input validation
      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        throw new Error('Topic is required and must be a non-empty string');
      }

      if (topic.length > 200) {
        throw new Error('Topic is too long (maximum 200 characters)');
      }

      // Content safety check
      if (this.containsInappropriateContent(topic)) {
        throw new Error('Topic contains inappropriate content');
      }

      const cleanTopic = topic.trim();
      
      // Check cache first
      const cachedResult = await this.getCachedScenario(cleanTopic);
      if (cachedResult && !options.forceNew) {
        logger.info('Returning cached scenario', { topic: cleanTopic });
        return {
          ...cachedResult,
          cached: true
        };
      }

      // Get appropriate prompt
      const prompt = getPromptForTopic(cleanTopic, options.promptType);
      
      // Add safety prompt
      const safeSystemPrompt = `${prompt.systemPrompt}\n\n${SAFETY_PROMPT}`;

      // Generation options
      const generationOptions = {
        temperature: options.temperature || 0.8,
        maxTokens: options.maxTokens || 1000,
        topP: options.topP || 0.9,
        topK: options.topK || 40
      };

      logger.info('Starting scenario generation', {
        topic: cleanTopic,
        promptType: prompt.type,
        options: generationOptions
      });

      // Generate scenario with timeout
      const timeoutMs = process.env.SCENARIO_TIMEOUT_MS || 30000;
      const result = await Promise.race([
        this.provider.generateScenario(safeSystemPrompt, prompt.userPrompt, generationOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
        )
      ]);

      // Validate result
      if (!result || !result.content) {
        throw new Error('Invalid response from AI provider');
      }

      // Post-process content
      const processedContent = this.postProcessContent(result.content);

      // Prepare final result
      const scenario = {
        id: this.generateScenarioId(),
        topic: cleanTopic,
        content: processedContent,
        promptType: prompt.type,
        provider: result.provider,
        model: result.model,
        tokens: result.tokens,
        generatedAt: new Date().toISOString(),
        cached: false
      };

      // Cache the result
      await this.cacheScenario(cleanTopic, scenario);

      logger.info('Scenario generated successfully', {
        scenarioId: scenario.id,
        topic: cleanTopic,
        contentLength: processedContent.length,
        provider: result.provider
      });

      return scenario;

    } catch (error) {
      logger.error('Scenario generation failed', {
        topic: topic,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * UC-010: Generate random public scenario
   */
  async generateRandomScenario() {
    const randomTopics = [
      'Nếu như con người có thể bay',
      'Nếu như động vật có thể nói chuyện',
      'Nếu như thời gian có thể dừng lại',
      'Nếu như mọi người đều có siêu năng lực',
      'Nếu như Internet không tồn tại',
      'Nếu như con người sống được 1000 năm',
      'Nếu như trọng lực Trái Đất yếu hơn',
      'Nếu như mọi người đều có thể đọc được suy nghĩ',
      'Nếu như robot thông minh hơn con người',
      'Nếu như có thể du hành thời gian'
    ];

    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    return await this.generateScenario(randomTopic, { forceNew: true });
  }

  /**
   * Content safety filtering
   */
  containsInappropriateContent(text) {
    const blockedKeywords = (process.env.BLOCKED_KEYWORDS || '').split(',').map(k => k.trim().toLowerCase());
    const textLower = text.toLowerCase();

    return blockedKeywords.some(keyword => 
      keyword.length > 0 && textLower.includes(keyword)
    );
  }

  /**
   * Post-process generated content
   */
  postProcessContent(content) {
    // Remove any potential harmful content
    let processed = content.trim();
    
    // Ensure proper Vietnamese formatting
    processed = processed.replace(/\s+/g, ' ');
    
    // Remove any incomplete sentences at the end
    const sentences = processed.split(/[.!?]/);
    if (sentences.length > 1 && sentences[sentences.length - 1].trim().length < 10) {
      sentences.pop();
      processed = sentences.join('.') + '.';
    }

    return processed;
  }

  /**
   * Generate unique scenario ID
   */
  generateScenarioId() {
    return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cache scenario result
   */
  async cacheScenario(topic, scenario) {
    try {
      const redis = getRedisClient();
      const cacheKey = `scenario:${Buffer.from(topic).toString('base64')}`;
      const cacheValue = JSON.stringify(scenario);
      
      // Cache for 1 hour
      await redis.setEx(cacheKey, 3600, cacheValue);
      
      logger.debug('Scenario cached', { topic, cacheKey });
    } catch (error) {
      logger.warn('Failed to cache scenario', { error: error.message });
      // Don't throw error, caching is not critical
    }
  }

  /**
   * Get cached scenario
   */
  async getCachedScenario(topic) {
    try {
      const redis = getRedisClient();
      const cacheKey = `scenario:${Buffer.from(topic).toString('base64')}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.warn('Failed to get cached scenario', { error: error.message });
      return null;
    }
  }

  /**
   * Health check for AI provider
   */
  async healthCheck() {
    try {
      return await this.provider.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      provider: process.env.AI_PROVIDER || 'gemini',
      model: this.provider.model,
      available: !!this.provider
    };
  }

  /**
   * Clear cache for a topic
   */
  async clearCache(topic) {
    try {
      const redis = getRedisClient();
      const cacheKey = `scenario:${Buffer.from(topic).toString('base64')}`;
      await redis.del(cacheKey);
      logger.info('Cache cleared for topic', { topic });
    } catch (error) {
      logger.warn('Failed to clear cache', { error: error.message });
    }
  }
}

module.exports = AIService;