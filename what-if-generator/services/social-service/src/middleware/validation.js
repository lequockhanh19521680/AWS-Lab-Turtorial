const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', { 
      errors: errors.array(), 
      path: req.path,
      userId: req.user?.id 
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Post validation rules
const validateCreatePost = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Content must be between 1 and 2000 characters'),
  body('type')
    .optional()
    .isIn(['achievement', 'scenario', 'milestone', 'custom'])
    .withMessage('Invalid post type'),
  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid visibility setting'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  handleValidationErrors
];

const validateUpdatePost = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Content must be between 1 and 2000 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid visibility setting'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  handleValidationErrors
];

// Comment validation rules
const validateCreateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  body('parentCommentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID'),
  handleValidationErrors
];

const validateUpdateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  handleValidationErrors
];

// User profile validation rules
const validateUpdateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be between 1 and 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  body('socialLinks.twitter')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Twitter handle must be less than 100 characters'),
  body('socialLinks.instagram')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Instagram handle must be less than 100 characters'),
  body('socialLinks.facebook')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Facebook handle must be less than 100 characters'),
  body('socialLinks.linkedin')
    .optional()
    .isLength({ max: 100 })
    .withMessage('LinkedIn handle must be less than 100 characters'),
  handleValidationErrors
];

// Achievement validation rules
const validateCreateAchievement = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('category')
    .isIn(['creation', 'interaction', 'social', 'milestone', 'special'])
    .withMessage('Invalid category'),
  body('points')
    .isInt({ min: 0, max: 1000 })
    .withMessage('Points must be between 0 and 1000'),
  body('rarity')
    .isIn(['common', 'uncommon', 'rare', 'epic', 'legendary'])
    .withMessage('Invalid rarity'),
  handleValidationErrors
];

// Parameter validation rules
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateUpdateComment,
  validateUpdateProfile,
  validateCreateAchievement,
  validateObjectId,
  validatePagination,
  validateSearch
};