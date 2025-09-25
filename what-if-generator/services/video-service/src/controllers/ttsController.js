const TTSService = require('../services/ttsService');
const logger = require('../config/logger');

class TTSController {
  constructor() {
    this.ttsService = new TTSService();
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(req, res) {
    try {
      const { 
        text, 
        options = {} 
      } = req.body;
      const userId = req.user?.id;

      logger.info('Generating speech', {
        userId,
        textLength: text?.length,
        options
      });

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Text is required and must be a non-empty string'
        });
      }

      if (text.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Text is too long (maximum 5000 characters)'
        });
      }

      const result = await this.ttsService.generateSpeech(text, options);

      res.json({
        success: true,
        message: 'Giọng nói đã được tạo thành công',
        data: result
      });

    } catch (error) {
      logger.error('Generate speech error', {
        error: error.message,
        userId: req.user?.id
      });

      let errorMessage = 'Có lỗi xảy ra khi tạo giọng nói, vui lòng thử lại';
      let statusCode = 500;

      if (error.message.includes('TTS service not available')) {
        errorMessage = 'Dịch vụ chuyển đổi giọng nói chưa được cấu hình';
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Quá trình tạo giọng nói mất quá nhiều thời gian, vui lòng thử lại';
        statusCode = 408;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        code: error.code || 'TTS_ERROR'
      });
    }
  }

  /**
   * Generate speech with SSML
   */
  async generateSpeechWithSSML(req, res) {
    try {
      const { 
        ssml, 
        options = {} 
      } = req.body;
      const userId = req.user?.id;

      logger.info('Generating speech with SSML', {
        userId,
        ssmlLength: ssml?.length,
        options
      });

      if (!ssml || typeof ssml !== 'string' || ssml.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'SSML is required and must be a non-empty string'
        });
      }

      const result = await this.ttsService.generateSpeechWithSSML(ssml, options);

      res.json({
        success: true,
        message: 'Giọng nói với SSML đã được tạo thành công',
        data: result
      });

    } catch (error) {
      logger.error('Generate speech with SSML error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo giọng nói với SSML'
      });
    }
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(req, res) {
    try {
      const { languageCode = 'vi-VN' } = req.query;

      const result = await this.ttsService.getAvailableVoices(languageCode);

      if (result.error) {
        return res.status(503).json({
          success: false,
          message: result.error
        });
      }

      res.json({
        success: true,
        data: {
          voices: result.voices,
          languageCode,
          total: result.voices.length
        }
      });

    } catch (error) {
      logger.error('Get available voices error', {
        error: error.message,
        languageCode: req.query.languageCode
      });

      res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách giọng nói'
      });
    }
  }

  /**
   * Download generated audio
   */
  async downloadAudio(req, res) {
    try {
      const { audioId } = req.params;
      
      // This would typically get the file path from database
      // For now, construct the expected path
      const audioPath = `outputs/audio/tts_${audioId}.mp3`;
      
      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(audioPath)) {
        return res.status(404).json({
          success: false,
          message: 'Audio file not found'
        });
      }

      res.download(audioPath, `tts_${audioId}.mp3`, (error) => {
        if (error) {
          logger.error('Download audio error', {
            error: error.message,
            audioId
          });
        }
      });

    } catch (error) {
      logger.error('Download audio error', {
        error: error.message,
        audioId: req.params.audioId
      });

      res.status(500).json({
        success: false,
        message: 'Không thể tải xuống audio'
      });
    }
  }

  /**
   * Get TTS service health
   */
  async getHealth(req, res) {
    try {
      const health = await this.ttsService.healthCheck();

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });

    } catch (error) {
      logger.error('TTS health check error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Không thể kiểm tra trạng thái TTS service'
      });
    }
  }

  /**
   * Estimate speech duration
   */
  async estimateDuration(req, res) {
    try {
      const { text, speakingRate = 1.0 } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Text is required'
        });
      }

      const duration = this.ttsService.estimateDuration(text, speakingRate);

      res.json({
        success: true,
        data: {
          textLength: text.length,
          estimatedDuration: duration,
          speakingRate,
          unit: 'seconds'
        }
      });

    } catch (error) {
      logger.error('Estimate duration error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Không thể ước tính thời lượng'
      });
    }
  }

  /**
   * Generate speech for scenario (optimized for What If scenarios)
   */
  async generateScenarioSpeech(req, res) {
    try {
      const { 
        scenarioText, 
        options = {} 
      } = req.body;
      const userId = req.user?.id;

      logger.info('Generating scenario speech', {
        userId,
        scenarioTextLength: scenarioText?.length,
        options
      });

      if (!scenarioText) {
        return res.status(400).json({
          success: false,
          message: 'Scenario text is required'
        });
      }

      // Optimize TTS options for scenario narration
      const scenarioOptions = {
        languageCode: 'vi-VN',
        voiceName: 'vi-VN-Wavenet-A',
        gender: 'NEUTRAL',
        speakingRate: 0.9, // Slightly slower for better comprehension
        pitch: -2.0, // Slightly lower pitch for narration
        volumeGainDb: 2.0, // Slightly louder
        audioEncoding: 'MP3',
        ...options
      };

      const result = await this.ttsService.generateSpeech(scenarioText, scenarioOptions);

      res.json({
        success: true,
        message: 'Giọng thuyết trình viễn cảnh đã được tạo thành công',
        data: {
          ...result,
          optimizedFor: 'scenario_narration',
          voiceDescription: 'Giọng nam Bắc, phù hợp cho thuyết trình'
        }
      });

    } catch (error) {
      logger.error('Generate scenario speech error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo giọng thuyết trình viễn cảnh'
      });
    }
  }

  /**
   * Clean up old audio files
   */
  async cleanupFiles(req, res) {
    try {
      const { maxAgeHours = 24 } = req.body;

      const result = await this.ttsService.cleanupOldFiles(maxAgeHours);

      res.json({
        success: true,
        message: 'Audio files cleaned up successfully',
        data: result
      });

    } catch (error) {
      logger.error('Cleanup audio files error', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Không thể dọn dẹp audio files'
      });
    }
  }
}

module.exports = TTSController;