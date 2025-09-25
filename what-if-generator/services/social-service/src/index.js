const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const redis = require('redis');
const winston = require('winston');

// Import configurations
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');

// Import middleware
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const socialRoutes = require('./routes/social');
const achievementRoutes = require('./routes/achievements');
const interactionRoutes = require('./routes/interactions');
const feedRoutes = require('./routes/feed');

const app = express();
const PORT = process.env.PORT || 3006;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3005'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Limit each IP to 1000 requests per windowMs in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis connection
    let redisStatus = 'disconnected';
    try {
      const redisClient = require('./config/redis').getClient();
      await redisClient.ping();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'error';
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'social-service',
      version: '1.0.0',
      dependencies: {
        database: dbStatus,
        redis: redisStatus
      }
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'social-service',
      error: error.message
    });
  }
});

// API routes
app.use('/api/social', socialRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/feed', feedRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await mongoose.connection.close();
    const redisClient = require('./config/redis').getClient();
    await redisClient.quit();
    logger.info('Database and Redis connections closed');
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await mongoose.connection.close();
    const redisClient = require('./config/redis').getClient();
    await redisClient.quit();
    logger.info('Database and Redis connections closed');
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
  }
  
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info(`Social Service running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

module.exports = app;