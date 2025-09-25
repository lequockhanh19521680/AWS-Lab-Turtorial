const express = require('express');
const passport = require('passport');
const OAuthController = require('../controllers/oauthController');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  OAuthController.googleCallback
);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email']
}));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=oauth_failed' }),
  OAuthController.facebookCallback
);

// Link OAuth account to existing user
router.post('/link', authMiddleware, [
  body('provider')
    .isIn(['google', 'facebook'])
    .withMessage('Provider must be google or facebook'),
  body('providerId')
    .notEmpty()
    .withMessage('Provider ID is required'),
  body('providerData')
    .isObject()
    .withMessage('Provider data must be an object')
], handleValidationErrors, OAuthController.linkAccount);

// Unlink OAuth account
router.delete('/unlink/:provider', authMiddleware, OAuthController.unlinkAccount);

module.exports = router;