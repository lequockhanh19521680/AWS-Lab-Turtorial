const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../config/logger');

class AnthropicProvider {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
    
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey: this.apiKey,
    });
    
    logger.info('Anthropic provider initialized');
  }

  async generateScenario(systemPrompt, userPrompt, options = {}) {
    try {
      const requestOptions = {
        model: this.model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.8,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      };

      logger.info('Generating scenario with Anthropic', {
        model: this.model,
        config: requestOptions
      });

      const completion = await this.anthropic.messages.create(requestOptions);

      if (!completion.content || completion.content.length === 0) {
        throw new Error('No content returned from Anthropic');
      }

      const content = completion.content[0].text;

      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from Anthropic');
      }

      logger.info('Scenario generated successfully with Anthropic', {
        responseLength: content.length,
        tokensUsed: completion.usage
      });

      return {
        content: content.trim(),
        model: this.model,
        provider: 'anthropic',
        tokens: {
          prompt: completion.usage.input_tokens,
          completion: completion.usage.output_tokens,
          total: completion.usage.input_tokens + completion.usage.output_tokens
        }
      };

    } catch (error) {
      logger.error('Anthropic generation error', {
        error: error.message,
        model: this.model
      });

      // Handle specific Anthropic errors
      if (error.type === 'authentication_error') {
        throw new Error('Invalid Anthropic API key');
      }
      
      if (error.type === 'rate_limit_error') {
        throw new Error('Anthropic rate limit exceeded');
      }
      
      if (error.type === 'invalid_request_error' && error.message.includes('content_filter')) {
        throw new Error('Content was filtered by Anthropic safety settings');
      }

      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const completion = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      });

      return {
        status: 'healthy',
        provider: 'anthropic',
        model: this.model,
        response: completion.content[0].text.substring(0, 50)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'anthropic',
        error: error.message
      };
    }
  }
}

module.exports = AnthropicProvider;