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
    message: 'Too many requests from this IP, please try again later',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter (stricter)
 */
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Password reset rate limiter (very strict)
 */
const passwordResetLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration rate limiter
 */
const registrationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 registrations per hour
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Email verification rate limiter
 */
const emailVerificationLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 email verification requests per 15 minutes
  message: {
    success: false,
    message: 'Too many email verification attempts, please try again later',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  emailVerificationLimiter
};