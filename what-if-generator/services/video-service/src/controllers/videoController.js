const VideoGenerationService = require('../services/videoGenerationService');
const TTSService = require('../services/ttsService');
const logger = require('../config/logger');

class VideoController {
  constructor() {
    this.videoService = new VideoGenerationService();
    this.ttsService = new TTSService();
  }

  /**
   * Generate video with narration from scenario text
   */
  async generateVideoWithNarration(req, res) {
    try {
      const { 
        scenarioText, 
        prompt, 
        videoOptions = {}, 
        ttsOptions = {} 
      } = req.body;
      const userId = req.user?.id;

      logger.info('Generating video with narration', {
        userId,
        scenarioTextLength: scenarioText?.length,
        promptLength: prompt?.length,
        videoOptions,
        ttsOptions
      });

      // Validate input
      if (!scenarioText && !prompt) {
        return res.status(400).json({
          success: false,
          message: 'Either scenarioText or prompt is required'
        });
      }

      const videoPrompt = prompt || this.generateVideoPromptFromScenario(scenarioText);
      
      // Generate video and TTS in parallel
      const [videoResult, ttsResult] = await Promise.all([
        this.videoService.generateVideo(videoPrompt, videoOptions),
        this.ttsService.generateSpeech(scenarioText, ttsOptions)
      ]);

      // Combine video with audio
      const combinedVideoPath = `outputs/combined/video_with_narration_${videoResult.jobId}.mp4`;
      await this.videoService.createVideoWithAudio(
        videoResult.result.filePath,
        ttsResult.filePath,
        combinedVideoPath
      );

      const result = {
        jobId: videoResult.jobId,
        video: {
          id: videoResult.result.id,
          fileName: videoResult.result.fileName,
          filePath: videoResult.result.filePath,
          duration: videoResult.result.duration,
          resolution: videoResult.result.resolution,
          provider: videoResult.provider
        },
        audio: {
          id: ttsResult.id,
          fileName: ttsResult.fileName,
          filePath: ttsResult.filePath,
          duration: ttsResult.duration,
          voice: ttsResult.voiceName
        },
        combined: {
          filePath: combinedVideoPath,
          fileName: `video_with_narration_${videoResult.jobId}.mp4`
        },
        generatedAt: new Date().toISOString(),
        userAuthenticated: !!userId
      };

      res.json({
        success: true,
        message: 'Video với thuyết trình đã được tạo thành công',
        data: result
      });

    } catch (error) {
      logger.error('Generate video with narration error', {
        error: error.message,
        userId: req.user?.id
      });

      let errorMessage = 'Có lỗi xảy ra khi tạo video, vui lòng thử lại';
      let statusCode = 500;

      if (error.message.includes('No video generation provider configured')) {
        errorMessage = 'Dịch vụ tạo video chưa được cấu hình';
        statusCode = 503;
      } else if (error.message.includes('TTS service not available')) {
        errorMessage = 'Dịch vụ chuyển đổi giọng nói chưa được cấu hình';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Quá trình tạo video mất quá nhiều thời gian, vui lòng thử lại';
        statusCode = 408;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        code: error.code || 'VIDEO_GENERATION_ERROR'
      });
    }
  }

  /**
   * Generate video only (without TTS)
   */
  async generateVideo(req, res) {
    try {
      const { prompt, options = {} } = req.body;
      const userId = req.user?.id;

      logger.info('Generating video', {
        userId,
        prompt: prompt?.substring(0, 100) + '...',
        options
      });

      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      const result = await this.videoService.generateVideo(prompt, options);

      res.json({
        success: true,
        message: 'Video đã được tạo thành công',
        data: result
      });

    } catch (error) {
      logger.error('Generate video error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo video, vui lòng thử lại'
      });
    }
  }

  /**
   * Get video generation status
   */
  async getVideoStatus(req, res) {
    try {
      const { jobId } = req.params;

      // This would typically check a job queue or database
      // For now, return a mock status
      const status = {
        jobId,
        status: 'completed', // completed, processing, failed
        progress: 100,
        message: 'Video generation completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Get video status error', {
        error: error.message,
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Không thể lấy trạng thái video'
      });
    }
  }

  /**
   * Download generated video
   */
  async downloadVideo(req, res) {
    try {
      const { jobId } = req.params;
      
      // This would typically get the file path from database
      // For now, return a mock response
      const videoPath = `outputs/videos/video_${jobId}.mp4`;
      
      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({
          success: false,
          message: 'Video file not found'
        });
      }

      res.download(videoPath, `video_${jobId}.mp4`, (error) => {
        if (error) {
          logger.error('Download video error', {
            error: error.message,
            jobId
          });
        }
      });

    } catch (error) {
      logger.error('Download video error', {
        error: error.message,
        jobId: req.params.jobId
      });

      res.status(500).json({
        success: false,
        message: 'Không thể tải xuống video'
      });
    }
  }

  /**
   * Get provider status
   */
  async getProviderStatus(req, res) {
    try {
      const status = this.videoService.getProviderStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Get provider status error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Không thể lấy trạng thái provider'
      });
    }
  }

  /**
   * Generate video prompt from scenario text
   */
  generateVideoPromptFromScenario(scenarioText) {
    // Convert Vietnamese scenario text to English video prompt
    const prompt = `
      Create a cinematic 3D animation video showing: "${scenarioText}"
      
      Style: Futuristic, high-quality 3D animation
      Camera: Dynamic camera movements
      Lighting: Dramatic and atmospheric
      Duration: 10-15 seconds
      Resolution: 1280x720
      
      The video should visually represent the "what if" scenario described in the text.
    `.trim();

    return prompt;
  }

  /**
   * Clean up old files
   */
  async cleanupFiles(req, res) {
    try {
      const { maxAgeHours = 24 } = req.body;

      const [videoCleanup, ttsCleanup] = await Promise.all([
        this.videoService.cleanupOldFiles(maxAgeHours),
        this.ttsService.cleanupOldFiles(maxAgeHours)
      ]);

      res.json({
        success: true,
        message: 'Files cleaned up successfully',
        data: {
          videos: videoCleanup,
          audio: ttsCleanup,
          totalDeleted: (videoCleanup.deletedCount || 0) + (ttsCleanup.deletedCount || 0)
        }
      });

    } catch (error) {
      logger.error('Cleanup files error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Không thể dọn dẹp files'
      });
    }
  }
}

module.exports = VideoController;