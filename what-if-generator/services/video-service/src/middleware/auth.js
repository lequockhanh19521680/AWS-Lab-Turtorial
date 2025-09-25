const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../config/logger');

/**
 * Optional authentication middleware
 * Doesn't fail if no token is provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      
      logger.debug('User authenticated via JWT', {
        userId: decoded.id,
        email: decoded.email
      });
      
    } catch (jwtError) {
      // JWT verification failed, try to validate with user service
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
        const response = await axios.get(`${userServiceUrl}/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.data.success) {
          req.user = response.data.user;
          
          logger.debug('User authenticated via user service', {
            userId: response.data.user.id,
            email: response.data.user.email
          });
        } else {
          req.user = null;
        }
        
      } catch (serviceError) {
        logger.warn('Failed to validate token with user service', {
          error: serviceError.message,
          token: token.substring(0, 20) + '...'
        });
        req.user = null;
      }
    }
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Continue without authentication on error
    req.user = null;
    next();
  }
};

/**
 * Required authentication middleware
 * Fails if no valid token is provided
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      next();
      
    } catch (jwtError) {
      // JWT verification failed, try to validate with user service
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
        const response = await axios.get(`${userServiceUrl}/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (response.data.success) {
          req.user = response.data.user;
          next();
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          });
        }
        
      } catch (serviceError) {
        logger.error('Failed to validate token with user service', {
          error: serviceError.message
        });
        
        return res.status(401).json({
          success: false,
          message: 'Unable to validate token',
          code: 'TOKEN_VALIDATION_FAILED'
        });
      }
    }
    
  } catch (error) {
    logger.error('Required authentication middleware error', {
      error: error.message,
      ip: req.ip
    });
    
    return res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Admin role required middleware
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }

  next();
};

/**
 * Premium user required middleware
 */
const requirePremium = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  if (!['admin', 'premium'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Premium access required',
      code: 'PREMIUM_ACCESS_REQUIRED'
    });
  }

  next();
};

/**
 * API key authentication middleware
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey) {
    // Validate API key (this would typically check against a database)
    const validApiKeys = (process.env.VALID_API_KEYS || '').split(',').map(k => k.trim());
    
    if (validApiKeys.includes(apiKey)) {
      req.apiKey = apiKey;
      req.user = { id: 'api-user', role: 'api', source: 'api-key' };
      
      logger.debug('API key authentication successful', {
        apiKey: apiKey.substring(0, 8) + '...',
        ip: req.ip
      });
    } else {
      logger.warn('Invalid API key provided', {
        apiKey: apiKey.substring(0, 8) + '...',
        ip: req.ip
      });
    }
  }
  
  next();
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requirePremium,
  apiKeyAuth
};