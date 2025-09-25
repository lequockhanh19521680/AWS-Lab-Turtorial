const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import configurations
const { connectDB, closeDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');

// Import routes
const sharingRoutes = require('./routes/sharing');
const reportingRoutes = require('./routes/reporting');

// Import services for cleanup tasks
const SharingService = require('./services/sharingService');
const ReportingService = require('./services/reportingService');

const app = express();
const PORT = process.env.PORT || 3004;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'What If Generator - Sharing & Reporting Service API',
      version: '1.0.0',
      description: 'API documentation for Sharing & Reporting Service of What If Generator',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3005',
  credentials: true
}));

// Custom morgan format for better logging
morgan.token('user-id', (req) => req.user?.id || 'anonymous');
const morganFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      success: true,
      message: 'Sharing & Reporting Service is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: {
        status: dbStatus,
        host: mongoose.connection.host
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Sharing & Reporting Service API'
}));

// Routes
app.use('/sharing', sharingRoutes);
app.use('/reporting', reportingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'What If Generator - Sharing & Reporting Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      documentation: '/api-docs',
      sharing: {
        create: '/sharing/{scenarioId}',
        view: '/sharing/shared/{shareUrl}',
        myShares: '/sharing/my',
        analytics: '/sharing/analytics',
        qrCode: '/sharing/qr/{shareUrl}'
      },
      reporting: {
        report: '/reporting/report',
        options: '/reporting/options',
        pending: '/reporting/pending',
        stats: '/reporting/stats'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Global error handler', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { 
      stack: error.stack,
      details: error 
    }),
    timestamp: new Date().toISOString()
  });
});

// Cleanup functions
const sharingService = new SharingService();
const reportingService = new ReportingService();

const runCleanupTasks = async () => {
  try {
    logger.info('Running cleanup tasks...');
    
    // Cleanup expired shares
    const expiredShares = await sharingService.cleanupExpiredShares();
    if (expiredShares > 0) {
      logger.info(`Cleaned up ${expiredShares} expired shares`);
    }
    
    // Cleanup old reports
    const oldReports = await reportingService.cleanupOldReports();
    if (oldReports > 0) {
      logger.info(`Cleaned up ${oldReports} old reports`);
    }
    
  } catch (error) {
    logger.error('Error in cleanup tasks', { error: error.message });
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    // Close database connections
    try {
      await closeDB();
    } catch (error) {
      logger.error('Error closing database:', error);
    }
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();
    
    // Create logs directory
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Sharing & Reporting Service running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
    
    // Setup cleanup tasks (run every 6 hours)
    const cleanupInterval = 6 * 60 * 60 * 1000; // 6 hours
    setInterval(runCleanupTasks, cleanupInterval);
    
    // Run cleanup tasks on startup
    setTimeout(runCleanupTasks, 60000); // Run after 1 minute
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Start the server
startServer();