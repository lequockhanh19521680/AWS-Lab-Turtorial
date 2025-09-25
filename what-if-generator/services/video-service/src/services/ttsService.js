const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class TTSService {
  constructor() {
    this.client = null;
    this.initializeClient();
  }

  async initializeClient() {
    try {
      // Initialize Google Cloud TTS client
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT_ID) {
        this.client = new TextToSpeechClient({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        });
        logger.info('Google Cloud TTS client initialized');
      } else {
        logger.warn('Google Cloud TTS not configured - TTS features disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize TTS client', { error: error.message });
    }
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(text, options = {}) {
    if (!this.client) {
      throw new Error('TTS service not available - Google Cloud credentials not configured');
    }

    try {
      const {
        languageCode = 'vi-VN',
        voiceName = 'vi-VN-Wavenet-A',
        gender = 'NEUTRAL',
        speakingRate = 1.0,
        pitch = 0.0,
        volumeGainDb = 0.0,
        audioEncoding = 'MP3'
      } = options;

      logger.info('Generating speech', {
        textLength: text.length,
        languageCode,
        voiceName,
        speakingRate
      });

      const request = {
        input: { text: text },
        voice: {
          languageCode: languageCode,
          name: voiceName,
          ssmlGender: gender
        },
        audioConfig: {
          audioEncoding: audioEncoding,
          speakingRate: speakingRate,
          pitch: pitch,
          volumeGainDb: volumeGainDb
        }
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      // Save audio to file
      const audioId = uuidv4();
      const audioFileName = `tts_${audioId}.${audioEncoding.toLowerCase()}`;
      const audioPath = path.join('outputs', 'audio', audioFileName);
      
      // Create audio directory if it doesn't exist
      const audioDir = path.dirname(audioPath);
      await fs.mkdir(audioDir, { recursive: true });
      
      // Write audio content to file
      await fs.writeFile(audioPath, response.audioContent, 'binary');

      const result = {
        id: audioId,
        fileName: audioFileName,
        filePath: audioPath,
        duration: this.estimateDuration(text, speakingRate),
        audioEncoding: audioEncoding,
        languageCode: languageCode,
        voiceName: voiceName,
        textLength: text.length,
        generatedAt: new Date().toISOString()
      };

      logger.info('Speech generated successfully', {
        audioId,
        fileName: audioFileName,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('Speech generation failed', {
        error: error.message,
        textLength: text.length
      });
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(languageCode = 'vi-VN') {
    if (!this.client) {
      return { error: 'TTS service not available' };
    }

    try {
      const [result] = await this.client.listVoices({
        languageCode: languageCode
      });

      const voices = result.voices.map(voice => ({
        name: voice.name,
        languageCode: voice.languageCodes[0],
        gender: voice.ssmlGender,
        naturalSampleRateHertz: voice.naturalSampleRateHertz
      }));

      return { voices };

    } catch (error) {
      logger.error('Failed to get available voices', { error: error.message });
      throw error;
    }
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   */
  estimateDuration(text, speakingRate = 1.0) {
    // Average speaking rate: ~150 words per minute for Vietnamese
    // Average characters per word: ~5 for Vietnamese
    const wordsPerMinute = 150 * speakingRate;
    const charactersPerWord = 5;
    const words = text.length / charactersPerWord;
    const durationMinutes = words / wordsPerMinute;
    return Math.round(durationMinutes * 60); // Return seconds
  }

  /**
   * Generate speech with custom SSML
   */
  async generateSpeechWithSSML(ssml, options = {}) {
    if (!this.client) {
      throw new Error('TTS service not available');
    }

    try {
      const {
        languageCode = 'vi-VN',
        voiceName = 'vi-VN-Wavenet-A',
        gender = 'NEUTRAL',
        audioEncoding = 'MP3'
      } = options;

      const request = {
        input: { ssml: ssml },
        voice: {
          languageCode: languageCode,
          name: voiceName,
          ssmlGender: gender
        },
        audioConfig: {
          audioEncoding: audioEncoding
        }
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      const audioId = uuidv4();
      const audioFileName = `tts_ssml_${audioId}.${audioEncoding.toLowerCase()}`;
      const audioPath = path.join('outputs', 'audio', audioFileName);
      
      const audioDir = path.dirname(audioPath);
      await fs.mkdir(audioDir, { recursive: true });
      
      await fs.writeFile(audioPath, response.audioContent, 'binary');

      return {
        id: audioId,
        fileName: audioFileName,
        filePath: audioPath,
        audioEncoding: audioEncoding,
        languageCode: languageCode,
        voiceName: voiceName,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('SSML speech generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const audioDir = path.join('outputs', 'audio');
      const files = await fs.readdir(audioDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(audioDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old audio files`);
      }

      return { deletedCount };

    } catch (error) {
      logger.error('Failed to cleanup old audio files', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return {
          status: 'disabled',
          message: 'TTS service not configured'
        };
      }

      // Try to list voices as a health check
      await this.client.listVoices({ languageCode: 'vi-VN' });
      
      return {
        status: 'healthy',
        message: 'TTS service is operational',
        provider: 'Google Cloud TTS'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        provider: 'Google Cloud TTS'
      };
    }
  }
}

module.exports = TTSService;