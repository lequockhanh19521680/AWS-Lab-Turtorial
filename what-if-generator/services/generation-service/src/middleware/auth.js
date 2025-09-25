const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Optional authentication middleware
 * Doesn't require authentication but extracts user info if present
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'what-if-generator',
      audience: 'what-if-generator-users'
    });

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAuthenticated: true
    };

    logger.debug('User authenticated', { userId: decoded.id });
    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    logger.debug('Invalid or expired token, continuing without auth', { 
      error: error.message 
    });
    req.user = null;
    next();
  }
};

/**
 * Required authentication middleware
 * Requires valid authentication
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'what-if-generator',
      audience: 'what-if-generator-users'
    });

    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAuthenticated: true
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

/**
 * Admin authentication middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

/**
 * Premium user middleware (for future premium features)
 */
const requirePremium = (req, res, next) => {
  if (!req.user || !req.user.isPremium) {
    return res.status(403).json({
      success: false,
      message: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }
  next();
};

/**
 * Rate limit exemption for verified users
 */
const rateLimitExemption = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    req.rateLimit = {
      exempt: true
    };
  }
  next();
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requirePremium,
  rateLimitExemption
};