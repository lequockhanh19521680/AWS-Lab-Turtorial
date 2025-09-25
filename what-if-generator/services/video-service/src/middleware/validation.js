const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Generic validation middleware
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      
      logger.warn('Validation error', {
        error: errorMessage,
        property,
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }
    
    next();
  };
};

/**
 * Video generation validation schemas
 */
const videoGenerationSchema = Joi.object({
  scenarioText: Joi.string().max(10000).optional(),
  prompt: Joi.string().max(2000).optional(),
  videoOptions: Joi.object({
    duration: Joi.number().integer().min(5).max(60).default(10),
    resolution: Joi.string().valid('1280x720', '1920x1080', '720x1280', '1080x1920').default('1280x720'),
    style: Joi.string().valid('cinematic', 'realistic', 'cartoon', 'anime', 'documentary').default('cinematic'),
    fps: Joi.number().integer().min(12).max(60).default(24),
    seed: Joi.number().integer().optional()
  }).optional(),
  ttsOptions: Joi.object({
    voiceName: Joi.string().max(100).default('vi-VN-Wavenet-A'),
    speakingRate: Joi.number().min(0.25).max(4.0).default(0.9),
    pitch: Joi.number().min(-20.0).max(20.0).default(-2.0),
    volumeGainDb: Joi.number().min(-96.0).max(16.0).default(2.0),
    audioEncoding: Joi.string().valid('MP3', 'LINEAR16', 'OGG_OPUS').default('MP3')
  }).optional()
}).custom((value, helpers) => {
  // At least one of scenarioText or prompt must be provided
  if (!value.scenarioText && !value.prompt) {
    return helpers.error('custom.missingRequired');
  }
  return value;
}).messages({
  'custom.missingRequired': 'Either scenarioText or prompt is required'
});

const videoOnlySchema = Joi.object({
  prompt: Joi.string().max(2000).required(),
  options: Joi.object({
    duration: Joi.number().integer().min(5).max(60).default(10),
    resolution: Joi.string().valid('1280x720', '1920x1080', '720x1280', '1080x1920').default('1280x720'),
    style: Joi.string().valid('cinematic', 'realistic', 'cartoon', 'anime', 'documentary').default('cinematic'),
    fps: Joi.number().integer().min(12).max(60).default(24),
    seed: Joi.number().integer().optional()
  }).optional()
});

/**
 * TTS validation schemas
 */
const ttsSchema = Joi.object({
  text: Joi.string().max(5000).required(),
  options: Joi.object({
    languageCode: Joi.string().max(10).default('vi-VN'),
    voiceName: Joi.string().max(100).default('vi-VN-Wavenet-A'),
    gender: Joi.string().valid('NEUTRAL', 'FEMALE', 'MALE').default('NEUTRAL'),
    speakingRate: Joi.number().min(0.25).max(4.0).default(1.0),
    pitch: Joi.number().min(-20.0).max(20.0).default(0.0),
    volumeGainDb: Joi.number().min(-96.0).max(16.0).default(0.0),
    audioEncoding: Joi.string().valid('MP3', 'LINEAR16', 'OGG_OPUS').default('MP3')
  }).optional()
});

const ttsScenarioSchema = Joi.object({
  scenarioText: Joi.string().max(10000).required(),
  options: Joi.object({
    languageCode: Joi.string().max(10).default('vi-VN'),
    voiceName: Joi.string().max(100).default('vi-VN-Wavenet-A'),
    gender: Joi.string().valid('NEUTRAL', 'FEMALE', 'MALE').default('NEUTRAL'),
    speakingRate: Joi.number().min(0.25).max(4.0).default(0.9),
    pitch: Joi.number().min(-20.0).max(20.0).default(-2.0),
    volumeGainDb: Joi.number().min(-96.0).max(16.0).default(2.0),
    audioEncoding: Joi.string().valid('MP3', 'LINEAR16', 'OGG_OPUS').default('MP3')
  }).optional()
});

const ttsSSMLSchema = Joi.object({
  ssml: Joi.string().max(10000).required(),
  options: Joi.object({
    languageCode: Joi.string().max(10).default('vi-VN'),
    voiceName: Joi.string().max(100).default('vi-VN-Wavenet-A'),
    gender: Joi.string().valid('NEUTRAL', 'FEMALE', 'MALE').default('NEUTRAL'),
    audioEncoding: Joi.string().valid('MP3', 'LINEAR16', 'OGG_OPUS').default('MP3')
  }).optional()
});

/**
 * Parameter validation schemas
 */
const jobIdSchema = Joi.object({
  jobId: Joi.string().uuid().required()
});

const audioIdSchema = Joi.object({
  audioId: Joi.string().uuid().required()
});

/**
 * Query validation schemas
 */
const voicesQuerySchema = Joi.object({
  languageCode: Joi.string().max(10).default('vi-VN')
});

/**
 * Cleanup validation schema
 */
const cleanupSchema = Joi.object({
  maxAgeHours: Joi.number().integer().min(1).max(168).default(24) // 1 hour to 1 week
});

/**
 * Duration estimation schema
 */
const durationEstimationSchema = Joi.object({
  text: Joi.string().max(10000).required(),
  speakingRate: Joi.number().min(0.25).max(4.0).default(1.0)
});

module.exports = {
  validateRequest,
  videoGenerationSchema,
  videoOnlySchema,
  ttsSchema,
  ttsScenarioSchema,
  ttsSSMLSchema,
  jobIdSchema,
  audioIdSchema,
  voicesQuerySchema,
  cleanupSchema,
  durationEstimationSchema
};