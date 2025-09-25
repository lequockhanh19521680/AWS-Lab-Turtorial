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

    // Replace request data with validated/sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Schema validation cho generate scenario request
 */
const generateScenarioSchema = Joi.object({
  topic: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Chủ đề không được để trống',
      'string.min': 'Chủ đề phải có ít nhất 3 ký tự',
      'string.max': 'Chủ đề không được quá 200 ký tự',
      'any.required': 'Chủ đề là bắt buộc'
    }),
  
  options: Joi.object({
    promptType: Joi.string()
      .valid('default', 'historical', 'scientific', 'social', 'fantasy')
      .optional(),
    
    temperature: Joi.number()
      .min(0.1)
      .max(2.0)
      .optional(),
    
    maxTokens: Joi.number()
      .integer()
      .min(100)
      .max(2000)
      .optional(),
    
    forceNew: Joi.boolean()
      .optional(),
    
    language: Joi.string()
      .valid('vi', 'en')
      .default('vi')
      .optional()
  }).optional().default({})
});

/**
 * Schema validation cho feedback request
 */
const feedbackSchema = Joi.object({
  scenarioId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Scenario ID không được để trống',
      'any.required': 'Scenario ID là bắt buộc'
    }),
  
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating phải là số',
      'number.integer': 'Rating phải là số nguyên',
      'number.min': 'Rating phải từ 1 đến 5',
      'number.max': 'Rating phải từ 1 đến 5',
      'any.required': 'Rating là bắt buộc'
    }),
  
  feedback: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Feedback không được quá 500 ký tự'
    }),
  
  tags: Joi.array()
    .items(Joi.string().valid('helpful', 'creative', 'funny', 'boring', 'inappropriate'))
    .max(5)
    .optional()
});

/**
 * Schema validation cho regenerate request
 */
const regenerateSchema = Joi.object({
  topic: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required(),
  
  previousScenarioId: Joi.string()
    .optional(),
  
  options: Joi.object({
    promptType: Joi.string()
      .valid('default', 'historical', 'scientific', 'social', 'fantasy')
      .optional(),
    
    temperature: Joi.number()
      .min(0.1)
      .max(2.0)
      .optional(),
    
    style: Joi.string()
      .valid('creative', 'serious', 'humorous', 'dramatic')
      .optional()
  }).optional().default({})
});

/**
 * Schema validation cho batch generation request
 */
const batchGenerateSchema = Joi.object({
  topics: Joi.array()
    .items(Joi.string().trim().min(3).max(200))
    .min(1)
    .max(5)
    .required()
    .messages({
      'array.min': 'Phải có ít nhất 1 chủ đề',
      'array.max': 'Không được quá 5 chủ đề cùng lúc'
    }),
  
  options: Joi.object({
    promptType: Joi.string()
      .valid('default', 'historical', 'scientific', 'social', 'fantasy')
      .optional(),
    
    temperature: Joi.number()
      .min(0.1)
      .max(2.0)
      .optional()
  }).optional().default({})
});

/**
 * Middleware để validate generate scenario
 */
const validateGenerateScenario = validate(generateScenarioSchema);

/**
 * Middleware để validate feedback
 */
const validateFeedback = validate(feedbackSchema);

/**
 * Middleware để validate regenerate
 */
const validateRegenerate = validate(regenerateSchema);

/**
 * Middleware để validate batch generate
 */
const validateBatchGenerate = validate(batchGenerateSchema);

/**
 * Validate query parameters
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Query schema cho pagination
 */
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  
  sort: Joi.string()
    .valid('createdAt', 'rating', 'popularity')
    .default('createdAt'),
  
  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

const validatePagination = validateQuery(paginationSchema);

module.exports = {
  validate,
  validateGenerateScenario,
  validateFeedback,
  validateRegenerate,
  validateBatchGenerate,
  validatePagination,
  generateScenarioSchema,
  feedbackSchema,
  regenerateSchema,
  batchGenerateSchema,
  paginationSchema
};