const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * General rate limiter for all endpoints
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits for different user types
    if (req.user?.role === 'admin') return 10000; // Unlimited for admin
    if (req.user?.role === 'premium') return 1000; // 1000 requests per 15 min for premium
    if (req.user?.id) return 100; // 100 requests per 15 min for authenticated users
    return 20; // 20 requests per 15 min for anonymous users
  },
  message: {
    success: false,
    message: 'Quá nhiều requests, vui lòng thử lại sau 15 phút',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      message: 'Quá nhiều requests, vui lòng thử lại sau 15 phút',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Video generation specific rate limiter
 */
const videoGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    if (req.user?.role === 'admin') return 100; // 100 videos per hour for admin
    if (req.user?.role === 'premium') return 20; // 20 videos per hour for premium
    if (req.user?.id) return 5; // 5 videos per hour for authenticated users
    return 1; // 1 video per hour for anonymous users
  },
  message: {
    success: false,
    message: 'Bạn đã tạo quá nhiều video trong 1 giờ, vui lòng thử lại sau',
    code: 'VIDEO_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Video generation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Bạn đã tạo quá nhiều video trong 1 giờ, vui lòng thử lại sau',
      code: 'VIDEO_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * TTS specific rate limiter
 */
const ttsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (req.user?.role === 'admin') return 1000; // 1000 TTS requests per 15 min for admin
    if (req.user?.role === 'premium') return 100; // 100 TTS requests per 15 min for premium
    if (req.user?.id) return 50; // 50 TTS requests per 15 min for authenticated users
    return 10; // 10 TTS requests per 15 min for anonymous users
  },
  message: {
    success: false,
    message: 'Bạn đã tạo quá nhiều giọng nói trong 15 phút, vui lòng thử lại sau',
    code: 'TTS_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('TTS rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      message: 'Bạn đã tạo quá nhiều giọng nói trong 15 phút, vui lòng thử lại sau',
      code: 'TTS_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * File download rate limiter
 */
const downloadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: (req) => {
    if (req.user?.role === 'admin') return 100; // 100 downloads per 5 min for admin
    if (req.user?.role === 'premium') return 50; // 50 downloads per 5 min for premium
    if (req.user?.id) return 20; // 20 downloads per 5 min for authenticated users
    return 5; // 5 downloads per 5 min for anonymous users
  },
  message: {
    success: false,
    message: 'Bạn đã tải xuống quá nhiều files trong 5 phút, vui lòng thử lại sau',
    code: 'DOWNLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  videoGenerationLimiter,
  ttsLimiter,
  downloadLimiter
};