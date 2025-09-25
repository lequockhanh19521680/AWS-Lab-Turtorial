const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// Redis store for rate limiting
const RedisStore = require('rate-limit-redis');

/**
 * General rate limiter
 */
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Generation rate limiter (stricter for AI calls)
 */
const generationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 generation requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu tạo viễn cảnh, vui lòng thử lại sau 15 phút',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to include user ID if available
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

/**
 * Authenticated user generation limiter (more generous)
 */
const authGenerationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // authenticated users get more requests
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu tạo viễn cảnh, vui lòng thử lại sau',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => !req.user // Skip for non-authenticated users
});

/**
 * Random scenario limiter
 */
const randomScenarioLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit random scenario requests
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu xem viễn cảnh ngẫu nhiên, vui lòng thử lại sau',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Batch generation limiter (very strict)
 */
const batchGenerationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // only 5 batch requests per hour
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu tạo hàng loạt, vui lòng thử lại sau 1 giờ',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Dynamic rate limiter based on user status
 */
const dynamicLimiter = (req, res, next) => {
  // Apply different limits based on user authentication
  if (req.user) {
    return authGenerationLimiter(req, res, next);
  } else {
    return generationLimiter(req, res, next);
  }
};

/**
 * Premium user rate limiter (if implemented in future)
 */
const premiumUserLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 100, // Premium users get even more requests
  message: {
    success: false,
    message: 'Đã đạt giới hạn, vui lòng thử lại sau',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `premium:${req.user?.id || req.ip}`,
  skip: (req) => !req.user?.isPremium
});

module.exports = {
  generalLimiter,
  generationLimiter,
  authGenerationLimiter,
  randomScenarioLimiter,
  batchGenerationLimiter,
  dynamicLimiter,
  premiumUserLimiter
};