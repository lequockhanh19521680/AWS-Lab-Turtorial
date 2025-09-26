import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from 'dotenv';
import { Server } from 'http';

// Import configurations
import { connectDB } from '@/config/database';
import { connectRedis } from '@/config/redis';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import oauthRoutes from '@/routes/oauth';
import profileRoutes from '@/routes/profile';

// Import passport configuration
import passport from '@/config/passport';

// Import middleware
import { generalLimiter } from '@/middleware/rateLimiter';

// Import types
import { CustomError, ApiResponse } from '@/types';

// Load environment variables
config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'What If Generator - User Service API',
      version: '1.0.0',
      description: 'API documentation for User Service of What If Generator',
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
  apis: ['./src/routes/*.ts'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Apply general rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  const healthCheck: ApiResponse = {
    success: true,
    message: 'User Service is healthy',
    timestamp: new Date().toISOString(),
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  };
  
  res.json(healthCheck);
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/users', userRoutes);
app.use('/profiles', profileRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response): void => {
  const rootResponse: ApiResponse = {
    success: true,
    message: 'What If Generator - User Service',
    timestamp: new Date().toISOString(),
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        documentation: '/api-docs',
        auth: '/auth',
        oauth: '/api/auth',
        users: '/users',
        profiles: '/profiles'
      }
    }
  };
  
  res.json(rootResponse);
});

// 404 handler
app.use('*', (req: Request, res: Response): void => {
  const notFoundResponse: ApiResponse = {
    success: false,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
    error: `${req.method} ${req.originalUrl} not found`
  };
  
  res.status(404).json(notFoundResponse);
});

// Global error handler
app.use((error: CustomError, req: Request, res: Response, next: NextFunction): void => {
  console.error('Global error handler:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: ApiResponse = {
    success: false,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      error: error.stack,
      details: error.details 
    })
  };
  
  res.status(error.status || 500).json(errorResponse);
});

// Graceful shutdown handler
const gracefulShutdown = (signal: string, server: Server): void => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server function
const startServer = async (): Promise<void> => {
  try {
    // Connect to databases
    console.log('🔌 Connecting to databases...');
    await connectDB();
    await connectRedis();
    
    // Run auto seed if enabled
    if (process.env.AUTO_SEED === 'true') {
      console.log('🌱 Running auto seed...');
      const AutoSeeder = require('../../../scripts/auto-seed');
      const seeder = new AutoSeeder();
      await seeder.run();
    }
    
    const server: Server = app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));
    process.on('SIGINT', () => gracefulShutdown('SIGINT', server));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch((error) => {
  console.error('❌ Unhandled error during startup:', error);
  process.exit(1);
});

export default app;