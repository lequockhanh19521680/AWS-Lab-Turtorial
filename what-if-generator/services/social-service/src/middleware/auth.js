const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    logger.info('User authenticated', { 
      userId: req.user.id, 
      path: req.path 
    });
    
    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message, 
      path: req.path 
    });
    
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Admin authorization error', { 
      error: error.message, 
      userId: req.user?.id 
    });
    
    res.status(403).json({
      success: false,
      message: 'Admin authorization failed.'
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  requireAdmin
};