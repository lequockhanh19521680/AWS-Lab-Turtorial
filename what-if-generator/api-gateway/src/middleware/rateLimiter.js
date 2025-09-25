const rateLimit = require('express-rate-limit');
const { getRedisClient, isRedisConnected } = require('../config/redis');

// Redis store for rate limiting
const RedisStore = require('rate-limit-redis');

/**
 * Create rate limiter with Redis store if available
 */
const createRateLimiter = (options) => {
  const limiterOptions = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skip: options.skip || (() => false),
    keyGenerator: options.keyGenerator || ((req) => {
      return req.user?.id || req.ip;
    }),
    ...options
  };

  // Use Redis store if available
  if (isRedisConnected()) {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => getRedisClient().sendCommand(args),
    });
  }

  return rateLimit(limiterOptions);
};

/**
 * General API rate limiter
 */
const generalLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many API requests, please try again later'
});

/**
 * Authentication rate limiter (stricter)
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth requests per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

/**
 * Generation rate limiter
 */
const generationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 generation requests per 15 minutes
  message: 'Too many generation requests, please try again later',
  keyGenerator: (req) => {
    // Different limits for authenticated vs anonymous users
    if (req.user?.id) {
      return `generation:user:${req.user.id}`;
    }
    return `generation:ip:${req.ip}`;
  }
});

/**
 * Anonymous user generation limiter (stricter)
 */
const anonymousGenerationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 requests for anonymous users
  message: 'Too many requests. Please register for higher limits.',
  skip: (req) => !!req.user, // Skip if user is authenticated
  keyGenerator: (req) => `anon:generation:${req.ip}`
});

/**
 * Admin rate limiter (more generous)
 */
const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Admin rate limit exceeded',
  skip: (req) => !req.user?.isAdmin,
  keyGenerator: (req) => `admin:${req.user?.id || req.ip}`
});

/**
 * File upload rate limiter
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many upload requests, please try again later'
});

/**
 * Password reset rate limiter (very strict)
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later'
});

/**
 * Dynamic rate limiter based on user type
 */
const dynamicLimiter = (req, res, next) => {
  // Admin users get higher limits
  if (req.user?.isAdmin) {
    return adminLimiter(req, res, next);
  }
  
  // Authenticated users get standard limits
  if (req.user?.id) {
    return generalLimiter(req, res, next);
  }
  
  // Anonymous users get stricter limits
  const strictLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Rate limit exceeded. Please register for higher limits.',
    keyGenerator: (req) => `anon:${req.ip}`
  });
  
  return strictLimiter(req, res, next);
};

/**
 * Endpoint-specific rate limiters
 */
const endpointLimiters = {
  '/api/auth/login': authLimiter,
  '/api/auth/register': authLimiter,
  '/api/auth/forgot-password': passwordResetLimiter,
  '/api/generate': [anonymousGenerationLimiter, generationLimiter],
  '/api/batch-generate': createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Only 5 batch requests per hour
    message: 'Too many batch generation requests'
  })
};

/**
 * Apply endpoint-specific rate limiting
 */
const applyEndpointLimiting = (req, res, next) => {
  const limiter = endpointLimiters[req.path];
  
  if (limiter) {
    if (Array.isArray(limiter)) {
      // Apply multiple limiters in sequence
      let index = 0;
      
      const applyNext = (err) => {
        if (err) return next(err);
        
        if (index >= limiter.length) {
          return next();
        }
        
        const currentLimiter = limiter[index++];
        currentLimiter(req, res, applyNext);
      };
      
      applyNext();
    } else {
      // Single limiter
      return limiter(req, res, next);
    }
  } else {
    next();
  }
};

/**
 * Rate limit info middleware
 */
const rateLimitInfo = (req, res, next) => {
  // Add rate limit info to response headers
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.rateLimit) {
      res.set({
        'X-RateLimit-Limit': req.rateLimit.limit,
        'X-RateLimit-Remaining': req.rateLimit.remaining,
        'X-RateLimit-Reset': new Date(Date.now() + req.rateLimit.msBeforeNext).toISOString()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  generationLimiter,
  anonymousGenerationLimiter,
  adminLimiter,
  uploadLimiter,
  passwordResetLimiter,
  dynamicLimiter,
  applyEndpointLimiting,
  rateLimitInfo,
  endpointLimiters
};