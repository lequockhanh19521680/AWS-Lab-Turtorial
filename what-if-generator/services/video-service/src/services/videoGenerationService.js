const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class VideoGenerationService {
  constructor() {
    this.providers = {
      runway: {
        name: 'Runway ML',
        enabled: process.env.RUNWAY_API_KEY ? true : false,
        endpoint: 'https://api.runwayml.com/v1/video/generate',
        timeout: 120000 // 2 minutes
      },
      pika: {
        name: 'Pika Labs',
        enabled: process.env.PIKA_API_KEY ? true : false,
        endpoint: 'https://api.pika.art/v1/generate',
        timeout: 90000 // 1.5 minutes
      },
      stability: {
        name: 'Stability AI',
        enabled: process.env.STABILITY_API_KEY ? true : false,
        endpoint: 'https://api.stability.ai/v2beta/image-to-video',
        timeout: 100000 // 1.67 minutes
      }
    };
    
    this.activeProvider = this.selectActiveProvider();
  }

  /**
   * Select the best available provider
   */
  selectActiveProvider() {
    // Priority order: Runway > Pika > Stability
    if (this.providers.runway.enabled) return 'runway';
    if (this.providers.pika.enabled) return 'pika';
    if (this.providers.stability.enabled) return 'stability';
    return null;
  }

  /**
   * Generate video from text prompt
   */
  async generateVideo(prompt, options = {}) {
    if (!this.activeProvider) {
      throw new Error('No video generation provider configured');
    }

    const {
      duration = 10,
      resolution = '1280x720',
      style = 'cinematic',
      fps = 24,
      seed = null
    } = options;

    const jobId = uuidv4();
    logger.info('Starting video generation', {
      jobId,
      prompt: prompt.substring(0, 100) + '...',
      provider: this.activeProvider,
      duration,
      resolution
    });

    try {
      const result = await this.generateWithProvider(
        this.activeProvider,
        prompt,
        { duration, resolution, style, fps, seed, jobId }
      );

      return {
        jobId,
        status: 'completed',
        provider: this.activeProvider,
        result,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Video generation failed', {
        jobId,
        provider: this.activeProvider,
        error: error.message
      });

      // Try fallback provider if available
      const fallbackProvider = this.getFallbackProvider();
      if (fallbackProvider && fallbackProvider !== this.activeProvider) {
        logger.info('Trying fallback provider', {
          jobId,
          fallbackProvider
        });

        try {
          const result = await this.generateWithProvider(
            fallbackProvider,
            prompt,
            { duration, resolution, style, fps, seed, jobId }
          );

          return {
            jobId,
            status: 'completed',
            provider: fallbackProvider,
            result,
            generatedAt: new Date().toISOString()
          };
        } catch (fallbackError) {
          logger.error('Fallback provider also failed', {
            jobId,
            fallbackProvider,
            error: fallbackError.message
          });
          throw error; // Throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Generate video with specific provider
   */
  async generateWithProvider(provider, prompt, options) {
    switch (provider) {
      case 'runway':
        return await this.generateWithRunway(prompt, options);
      case 'pika':
        return await this.generateWithPika(prompt, options);
      case 'stability':
        return await this.generateWithStability(prompt, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Generate video with Runway ML
   */
  async generateWithRunway(prompt, options) {
    const { duration, resolution, style, jobId } = options;
    
    const requestData = {
      prompt: prompt,
      duration: duration,
      resolution: resolution,
      style: style,
      watermark: false,
      seed: options.seed || Math.floor(Math.random() * 1000000)
    };

    const response = await axios.post(
      this.providers.runway.endpoint,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: this.providers.runway.timeout
      }
    );

    if (response.data.status === 'processing') {
      // Poll for completion
      return await this.pollRunwayJob(response.data.id, jobId);
    }

    return this.processRunwayResponse(response.data);
  }

  /**
   * Poll Runway job status
   */
  async pollRunwayJob(jobId, requestJobId) {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(
          `https://api.runwayml.com/v1/video/status/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`
            },
            timeout: 10000
          }
        );

        if (response.data.status === 'completed') {
          return this.processRunwayResponse(response.data);
        } else if (response.data.status === 'failed') {
          throw new Error('Video generation failed');
        }

        // Wait 10 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;

      } catch (error) {
        logger.error('Error polling Runway job', {
          jobId,
          requestJobId,
          error: error.message,
          attempt: attempts + 1
        });
        
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }

    throw new Error('Video generation timeout');
  }

  /**
   * Process Runway API response
   */
  async processRunwayResponse(data) {
    const videoId = uuidv4();
    const videoFileName = `video_${videoId}.mp4`;
    const videoPath = path.join('outputs', 'videos', videoFileName);
    
    // Create video directory if it doesn't exist
    const videoDir = path.dirname(videoPath);
    await fs.mkdir(videoDir, { recursive: true });

    // Download video file
    if (data.video_url) {
      const videoResponse = await axios.get(data.video_url, {
        responseType: 'stream',
        timeout: 60000
      });

      const writer = require('fs').createWriteStream(videoPath);
      videoResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    }

    return {
      id: videoId,
      fileName: videoFileName,
      filePath: videoPath,
      url: data.video_url,
      duration: data.duration,
      resolution: data.resolution,
      provider: 'runway',
      metadata: data
    };
  }

  /**
   * Generate video with Pika Labs
   */
  async generateWithPika(prompt, options) {
    // Pika Labs implementation would go here
    // This is a placeholder for the actual API integration
    throw new Error('Pika Labs integration not implemented yet');
  }

  /**
   * Generate video with Stability AI
   */
  async generateWithStability(prompt, options) {
    // Stability AI implementation would go here
    // This is a placeholder for the actual API integration
    throw new Error('Stability AI integration not implemented yet');
  }

  /**
   * Get fallback provider
   */
  getFallbackProvider() {
    if (this.activeProvider === 'runway' && this.providers.pika.enabled) {
      return 'pika';
    }
    if (this.activeProvider === 'pika' && this.providers.stability.enabled) {
      return 'stability';
    }
    if (this.activeProvider === 'stability' && this.providers.runway.enabled) {
      return 'runway';
    }
    return null;
  }

  /**
   * Create video with audio (combine video + TTS)
   */
  async createVideoWithAudio(videoPath, audioPath, outputPath) {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      
      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(audioPath)
          .outputOptions([
            '-c:v copy', // Copy video stream
            '-c:a aac',  // Re-encode audio to AAC
            '-map 0:v:0', // Map first input video
            '-map 1:a:0', // Map second input audio
            '-shortest'   // End when shortest stream ends
          ])
          .output(outputPath)
          .on('end', () => {
            logger.info('Video with audio created successfully', { outputPath });
            resolve({ outputPath });
          })
          .on('error', (error) => {
            logger.error('Failed to create video with audio', { error: error.message });
            reject(error);
          })
          .run();
      });

    } catch (error) {
      logger.error('Error creating video with audio', { error: error.message });
      throw error;
    }
  }

  /**
   * Get provider status
   */
  getProviderStatus() {
    return {
      activeProvider: this.activeProvider,
      providers: Object.entries(this.providers).map(([key, provider]) => ({
        name: key,
        displayName: provider.name,
        enabled: provider.enabled,
        configured: !!process.env[`${key.toUpperCase()}_API_KEY`]
      }))
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const status = this.getProviderStatus();
    
    if (!this.activeProvider) {
      return {
        status: 'unhealthy',
        message: 'No video generation provider configured',
        providers: status.providers
      };
    }

    return {
      status: 'healthy',
      message: 'Video generation service is operational',
      activeProvider: this.activeProvider,
      providers: status.providers
    };
  }

  /**
   * Clean up old video files
   */
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const videoDir = path.join('outputs', 'videos');
      const files = await fs.readdir(videoDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(videoDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old video files`);
      }

      return { deletedCount };

    } catch (error) {
      logger.error('Failed to cleanup old video files', { error: error.message });
      return { error: error.message };
    }
  }
}

module.exports = VideoGenerationService;