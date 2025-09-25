const OpenAI = require('openai');
const logger = require('../../config/logger');

class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    this.openai = new OpenAI({
      apiKey: this.apiKey,
    });
    
    logger.info('OpenAI provider initialized');
  }

  async generateScenario(systemPrompt, userPrompt, options = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];

      const requestOptions = {
        model: this.model,
        messages: messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.8,
        top_p: options.topP || 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      };

      logger.info('Generating scenario with OpenAI', {
        model: this.model,
        messagesCount: messages.length,
        config: requestOptions
      });

      const completion = await this.openai.chat.completions.create(requestOptions);

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No choices returned from OpenAI');
      }

      const content = completion.choices[0].message.content;

      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from OpenAI');
      }

      logger.info('Scenario generated successfully with OpenAI', {
        responseLength: content.length,
        tokensUsed: completion.usage
      });

      return {
        content: content.trim(),
        model: this.model,
        provider: 'openai',
        tokens: {
          prompt: completion.usage.prompt_tokens,
          completion: completion.usage.completion_tokens,
          total: completion.usage.total_tokens
        }
      };

    } catch (error) {
      logger.error('OpenAI generation error', {
        error: error.message,
        model: this.model
      });

      // Handle specific OpenAI errors
      if (error.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key');
      }
      
      if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded');
      }
      
      if (error.code === 'content_filter') {
        throw new Error('Content was filtered by OpenAI safety settings');
      }

      if (error.code === 'rate_limit_exceeded') {
        throw new Error('OpenAI rate limit exceeded');
      }

      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10
      });

      return {
        status: 'healthy',
        provider: 'openai',
        model: this.model,
        response: completion.choices[0].message.content.substring(0, 50)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'openai',
        error: error.message
      };
    }
  }
}

module.exports = OpenAIProvider;