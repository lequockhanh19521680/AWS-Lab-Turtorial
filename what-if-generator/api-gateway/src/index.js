const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import configurations and services
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { getAllServices } = require('./config/services');
const HealthCheckService = require('./services/healthCheck');

// Import middleware
const { 
  dynamicProxyRouter, 
  requestTiming, 
  requestId, 
  serviceHealthCheck 
} = require('./middleware/proxy');
const { 
  optionalAuth, 
  apiKeyAuth, 
  rateLimitExemption 
} = require('./middleware/auth');
const { 
  generalLimiter, 
  applyEndpointLimiting, 
  rateLimitInfo 
} = require('./middleware/rateLimiter');

// Import routes
const createHealthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize health check service
const healthCheckService = new HealthCheckService();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'What If Generator - API Gateway',
      version: '1.0.0',
      description: 'Unified API Gateway for What If Generator microservices',
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
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware setup
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3005').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
}));

// Request logging
if (process.env.LOG_REQUESTS === 'true') {
  morgan.token('user-id', (req) => req.user?.id || 'anonymous');
  morgan.token('request-id', (req) => req.requestId);
  
  const morganFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms (req-id: :request-id)';
  
  app.use(morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request middleware
app.use(requestId);
app.use(requestTiming);

// API key authentication (if enabled)
app.use(apiKeyAuth);

// Authentication middleware (optional for most routes)
app.use(optionalAuth);

// Rate limiting
app.use(rateLimitInfo);
app.use(rateLimitExemption);
app.use(generalLimiter);
app.use(applyEndpointLimiting);

// Service health checking
app.use(serviceHealthCheck(healthCheckService));

// Health check routes
app.use('/health', createHealthRoutes(healthCheckService));

// API documentation (if enabled)
if (process.env.ENABLE_API_DOCS === 'true') {
  const docsPath = process.env.API_DOCS_PATH || '/api-docs';
  app.use(docsPath, swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'What If Generator API'
  }));
}

// Root endpoint
app.get('/', (req, res) => {
  const services = getAllServices();
  const serviceList = Object.entries(services).map(([name, service]) => ({
    name: service.name,
    status: healthCheckService.getServiceStatus(name)?.status || 'unknown'
  }));

  res.json({
    success: true,
    message: 'What If Generator API Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: serviceList,
    endpoints: {
      health: '/health',
      documentation: process.env.ENABLE_API_DOCS === 'true' ? '/api-docs' : null,
      api: {
        auth: '/api/auth/*',
        users: '/api/users/*',
        generate: '/api/generate',
        scenarios: '/api/scenarios/*',
        sharing: '/api/sharing/*',
        reporting: '/api/reporting/*',
        video: '/api/video/*',
        tts: '/api/tts/*'
      },
      public: {
        shared: '/shared/*',
        qr: '/qr/*'
      }
    }
  });
});

// Metrics endpoint (if enabled)
if (process.env.ENABLE_METRICS === 'true') {
  app.get(process.env.METRICS_PATH || '/metrics', (req, res) => {
    const metrics = healthCheckService.getServiceMetrics();
    const overallHealth = healthCheckService.getOverallHealth();
    
    res.set('Content-Type', 'text/plain');
    res.send(`# API Gateway Metrics
gateway_uptime_seconds ${process.uptime()}
gateway_memory_usage_bytes ${process.memoryUsage().heapUsed}
gateway_healthy_services ${metrics.healthyServices}
gateway_total_services ${metrics.totalServices}
gateway_average_response_time_ms ${metrics.averageResponseTime}
gateway_overall_health_percentage ${overallHealth.healthPercentage}
`);
  });
}

// Main proxy router (handles all /api/* and other routes)
app.use('/', dynamicProxyRouter);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  logger.warn('404 - Route not found', {
    path: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the API documentation for available endpoints'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Global error handler', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    requestId: req.requestId
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    requestId: req.requestId,
    ...(isDevelopment && { 
      stack: error.stack,
      details: error 
    }),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
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
    // Connect to Redis (optional)
    await connectRedis();
    
    // Create logs directory
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 API Gateway running on port ${PORT}`);
      
      if (process.env.ENABLE_API_DOCS === 'true') {
        logger.info(`📚 API Documentation: http://localhost:${PORT}${process.env.API_DOCS_PATH || '/api-docs'}`);
      }
      
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      
      if (process.env.ENABLE_METRICS === 'true') {
        logger.info(`📊 Metrics: http://localhost:${PORT}${process.env.METRICS_PATH || '/metrics'}`);
      }
      
      // Log service configuration
      const services = getAllServices();
      logger.info('Configured services:', {
        services: Object.keys(services),
        urls: Object.fromEntries(
          Object.entries(services).map(([name, config]) => [name, config.url])
        )
      });
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
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