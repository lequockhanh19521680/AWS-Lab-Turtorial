const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../config/logger');

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-pro';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    logger.info('Gemini AI provider initialized');
  }

  async generateScenario(systemPrompt, userPrompt, options = {}) {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      
      // Combine system and user prompts for Gemini
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const generationConfig = {
        temperature: options.temperature || 0.8,
        topK: options.topK || 40,
        topP: options.topP || 0.9,
        maxOutputTokens: options.maxTokens || 1000,
      };

      logger.info('Generating scenario with Gemini', {
        model: this.model,
        promptLength: fullPrompt.length,
        config: generationConfig
      });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: fullPrompt }]
        }],
        generationConfig
      });

      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      logger.info('Scenario generated successfully with Gemini', {
        responseLength: text.length
      });

      return {
        content: text.trim(),
        model: this.model,
        provider: 'gemini',
        tokens: {
          prompt: this.estimateTokens(fullPrompt),
          completion: this.estimateTokens(text)
        }
      };

    } catch (error) {
      logger.error('Gemini generation error', {
        error: error.message,
        model: this.model
      });

      // Handle specific Gemini errors
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key');
      }
      
      if (error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini API quota exceeded');
      }
      
      if (error.message.includes('CONTENT_FILTER')) {
        throw new Error('Content was filtered by Gemini safety settings');
      }

      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  // Simple token estimation (approximately)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  async healthCheck() {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'Hello' }]
        }],
        generationConfig: {
          maxOutputTokens: 10
        }
      });

      const response = await result.response;
      const text = response.text();
      
      return {
        status: 'healthy',
        provider: 'gemini',
        model: this.model,
        response: text.substring(0, 50)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'gemini',
        error: error.message
      };
    }
  }
}

module.exports = GeminiProvider;