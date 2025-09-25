const { body, validationResult } = require('express-validator');

/**
 * Middleware để handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự và không quá 100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Tên phải có từ 1-50 ký tự'),
  
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Họ phải có từ 1-50 ký tự'),

  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống'),

  handleValidationErrors
];

/**
 * Validation rules for password reset request
 */
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),

  handleValidationErrors
];

/**
 * Validation rules for password reset
 */
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token không được để trống'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự và không quá 100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Xác nhận mật khẩu không khớp');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for change password
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại không được để trống'),
  
  body('newPassword')
    .isLength({ min: 6, max: 100 })
    .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự và không quá 100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Xác nhận mật khẩu mới không khớp');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for change email
 */
const validateChangeEmail = [
  body('newEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email mới không hợp lệ'),
  
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống'),

  handleValidationErrors
];

/**
 * Validation rules for update profile
 */
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Tên phải có từ 1-50 ký tự'),
  
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('Họ phải có từ 1-50 ký tự'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences phải là object'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme chỉ có thể là light hoặc dark'),
  
  body('preferences.language')
    .optional()
    .isIn(['vi', 'en'])
    .withMessage('Language chỉ có thể là vi hoặc en'),
  
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications phải là boolean'),

  handleValidationErrors
];

/**
 * Validation rules for delete account
 */
const validateDeleteAccount = [
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống'),

  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateChangePassword,
  validateChangeEmail,
  validateUpdateProfile,
  validateDeleteAccount,
  handleValidationErrors
};