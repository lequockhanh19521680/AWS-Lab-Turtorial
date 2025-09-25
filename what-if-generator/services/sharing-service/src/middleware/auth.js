const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Required authentication middleware
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
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
 * Optional authentication middleware
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
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
    // If token is invalid, continue without authentication
    logger.debug('Invalid token, continuing without auth', { 
      error: error.message 
    });
    req.user = null;
    next();
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
 * Moderator authentication middleware (admin or moderator)
 */
const requireModerator = (req, res, next) => {
  if (!req.user || (!req.user.isAdmin && !req.user.isModerator)) {
    return res.status(403).json({
      success: false,
      message: 'Moderator access required'
    });
  }
  next();
};

/**
 * Check if user owns the resource
 */
const checkOwnership = (resourceUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.id !== resourceUserId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own resources'
      });
    }

    next();
  };
};

/**
 * Rate limiting exemption for authenticated users
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
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireModerator,
  checkOwnership,
  rateLimitExemption
};