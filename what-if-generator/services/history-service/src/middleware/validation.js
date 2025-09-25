const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Middleware để validate request data sử dụng Joi
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      logger.warn('Validation failed', { 
        path: req.path,
        method: req.method,
        errors 
      });

      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors
      });
    }

    req[property] = value;
    next();
  };
};

/**
 * Schema cho tạo scenario từ generation service
 */
const createScenarioSchema = Joi.object({
  userId: Joi.string().required(),
  scenarioId: Joi.string().required(),
  topic: Joi.string().trim().min(3).max(200).required(),
  content: Joi.string().min(10).max(5000).required(),
  promptType: Joi.string().valid('default', 'historical', 'scientific', 'social', 'fantasy').default('default'),
  provider: Joi.string().default('gemini'),
  model: Joi.string().default('gemini-pro'),
  tokens: Joi.object({
    prompt: Joi.number().min(0).default(0),
    completion: Joi.number().min(0).default(0),
    total: Joi.number().min(0).default(0)
  }).default({}),
  generatedAt: Joi.date().required(),
  previousScenarioId: Joi.string().allow(null).default(null)
});

/**
 * Schema cho update scenario (UC-007: Tagging)
 */
const updateScenarioSchema = Joi.object({
  tags: Joi.array().items(
    Joi.string().trim().min(1).max(30)
  ).max(10).optional(),
  
  isFavorite: Joi.boolean().optional(),
  
  rating: Joi.number().integer().min(1).max(5).allow(null).optional(),
  
  isPublic: Joi.boolean().optional()
});

/**
 * Schema cho search scenarios (UC-008)
 */
const searchScenariosSchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).optional(),
  tags: Joi.string().optional(),
  promptType: Joi.string().valid('default', 'historical', 'scientific', 'social', 'fantasy').optional(),
  isFavorite: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sort: Joi.string().valid('createdAt', 'updatedAt', 'rating', 'viewCount').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Schema cho pagination
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sort: Joi.string().valid('createdAt', 'updatedAt', 'rating', 'viewCount', 'shareCount').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Schema cho bulk operations
 */
const bulkUpdateSchema = Joi.object({
  scenarioIds: Joi.array().items(Joi.string()).min(1).max(50).required(),
  operation: Joi.string().valid('delete', 'favorite', 'unfavorite', 'makePublic', 'makePrivate').required(),
  data: Joi.object({
    tags: Joi.array().items(Joi.string().trim().min(1).max(30)).max(10).optional()
  }).optional()
});

/**
 * Schema cho analytics
 */
const analyticsEventSchema = Joi.object({
  scenarioId: Joi.string().required(),
  event: Joi.string().valid('view', 'share', 'rate', 'timeSpent').required(),
  data: Joi.object({
    rating: Joi.number().integer().min(1).max(5).when('..event', { 
      is: 'rate', 
      then: Joi.required() 
    }),
    platform: Joi.string().valid('facebook', 'twitter', 'linkedin', 'copy', 'other').when('..event', { 
      is: 'share', 
      then: Joi.required() 
    }),
    timeSpent: Joi.number().min(0).when('..event', { 
      is: 'timeSpent', 
      then: Joi.required() 
    }),
    device: Joi.string().valid('desktop', 'mobile', 'tablet').optional(),
    country: Joi.string().length(2).optional(),
    referrer: Joi.string().uri().optional()
  }).optional()
});

/**
 * Schema cho export request
 */
const exportRequestSchema = Joi.object({
  format: Joi.string().valid('json', 'csv', 'txt').default('json'),
  includeContent: Joi.boolean().default(true),
  includeAnalytics: Joi.boolean().default(false),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  promptType: Joi.string().valid('default', 'historical', 'scientific', 'social', 'fantasy').optional()
});

// Validation middleware functions
const validateCreateScenario = validate(createScenarioSchema);
const validateUpdateScenario = validate(updateScenarioSchema);
const validateSearchScenarios = validate(searchScenariosSchema, 'query');
const validatePagination = validate(paginationSchema, 'query');
const validateBulkUpdate = validate(bulkUpdateSchema);
const validateAnalyticsEvent = validate(analyticsEventSchema);
const validateExportRequest = validate(exportRequestSchema, 'query');

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (req, res, next) => {
  const { id, scenarioId } = req.params;
  const targetId = id || scenarioId;
  
  if (targetId && !targetId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  next();
};

module.exports = {
  validate,
  validateCreateScenario,
  validateUpdateScenario,
  validateSearchScenarios,
  validatePagination,
  validateBulkUpdate,
  validateAnalyticsEvent,
  validateExportRequest,
  validateObjectId,
  
  // Export schemas for testing
  createScenarioSchema,
  updateScenarioSchema,
  searchScenariosSchema,
  paginationSchema,
  bulkUpdateSchema,
  analyticsEventSchema,
  exportRequestSchema
};