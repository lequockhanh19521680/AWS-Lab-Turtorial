const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../config/logger');
const { getRedisClient, isRedisConnected } = require('../config/redis');

/**
 * Optional authentication middleware
 * Extracts user info if token is present but doesn't block request
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token locally first
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'what-if-generator',
      audience: 'what-if-generator-users'
    });

    // Basic user info from token
    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAuthenticated: true
    };

    // Try to get extended user info from cache
    if (isRedisConnected()) {
      try {
        const redis = getRedisClient();
        const cachedUser = await redis.get(`user:${decoded.id}`);
        
        if (cachedUser) {
          const userInfo = JSON.parse(cachedUser);
          req.user = { ...req.user, ...userInfo };
        }
      } catch (cacheError) {
        logger.debug('Cache miss for user info', { userId: decoded.id });
      }
    }

    logger.debug('User authenticated via token', { userId: decoded.id });
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
 * Blocks request if no valid token
 */
const requireAuth = async (req, res, next) => {
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

    // Check token blacklist
    if (isRedisConnected()) {
      try {
        const redis = getRedisClient();
        const isBlacklisted = await redis.get(`blacklist_${token}`);
        
        if (isBlacklisted) {
          return res.status(401).json({
            success: false,
            message: 'Token has been invalidated'
          });
        }
      } catch (redisError) {
        logger.warn('Redis error checking token blacklist', { error: redisError.message });
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      isAuthenticated: true
    };

    // Try to enrich user data from cache or user service
    await enrichUserData(req);

    logger.debug('User authenticated and required auth passed', { userId: decoded.id });
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
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Moderator authentication middleware
 */
const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isAdmin && !req.user.isModerator) {
    return res.status(403).json({
      success: false,
      message: 'Moderator access required'
    });
  }

  next();
};

/**
 * Enrich user data from cache or user service
 */
const enrichUserData = async (req) => {
  if (!req.user || !req.user.id) return;

  try {
    let userInfo = null;

    // Try cache first
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const cachedUser = await redis.get(`user:${req.user.id}`);
      
      if (cachedUser) {
        userInfo = JSON.parse(cachedUser);
      }
    }

    // If not in cache, fetch from user service
    if (!userInfo) {
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL;
        if (userServiceUrl) {
          const response = await axios.get(`${userServiceUrl}/users/profile`, {
            headers: {
              'Authorization': req.headers.authorization
            },
            timeout: 5000
          });

          if (response.data.success) {
            userInfo = response.data.data.user;
            
            // Cache the user info
            if (isRedisConnected()) {
              const redis = getRedisClient();
              await redis.setEx(`user:${req.user.id}`, 300, JSON.stringify(userInfo)); // 5 min cache
            }
          }
        }
      } catch (serviceError) {
        logger.debug('Failed to fetch user info from user service', {
          error: serviceError.message,
          userId: req.user.id
        });
      }
    }

    // Merge user info
    if (userInfo) {
      req.user = {
        ...req.user,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        isAdmin: userInfo.isAdmin || false,
        isModerator: userInfo.isModerator || false,
        emailVerified: userInfo.emailVerified || false,
        preferences: userInfo.preferences || {}
      };
    }

  } catch (error) {
    logger.debug('Error enriching user data', {
      error: error.message,
      userId: req.user.id
    });
  }
};

/**
 * API Key authentication middleware (optional)
 */
const apiKeyAuth = (req, res, next) => {
  if (process.env.ENABLE_API_KEY_AUTH !== 'true') {
    return next();
  }

  const apiKeyHeader = process.env.API_KEY_HEADER || 'X-API-Key';
  const apiKey = req.get(apiKeyHeader);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }

  // In a real implementation, you would validate the API key
  // against a database or configuration
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  req.apiKey = apiKey;
  next();
};

/**
 * Rate limiting exemption for authenticated users
 */
const rateLimitExemption = (req, res, next) => {
  if (req.user && req.user.emailVerified) {
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
  requireModerator,
  apiKeyAuth,
  rateLimitExemption,
  enrichUserData
};