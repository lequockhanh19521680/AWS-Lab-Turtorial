/**
 * Environment Configuration Loader
 * Loads environment variables in the correct order of priority
 */

const path = require('path');
const fs = require('fs');

class EnvironmentLoader {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.rootPath = path.resolve(__dirname, '../../');
    this.loadedFiles = [];
  }

  /**
   * Load environment variables in order of priority:
   * 1. System environment variables (highest priority)
   * 2. .env.production/.env.test/.env.development (environment-specific)
   * 3. .env (global defaults)
   * 4. .env.local (local overrides, gitignored)
   */
  load() {
    try {
      // Load global .env first (lowest priority)
      this.loadFile('.env');
      
      // Load environment-specific .env file
      this.loadFile(`.env.${this.env}`);
      
      // Load .env.local for local overrides (highest priority for local files)
      this.loadFile('.env.local');
      
      // System environment variables are already loaded by Node.js
      // and have the highest priority
      
      console.log(`✅ Environment loaded: ${this.env}`);
      console.log(`📁 Loaded files: ${this.loadedFiles.join(', ')}`);
      
      return this.getConfig();
    } catch (error) {
      console.error('❌ Failed to load environment configuration:', error.message);
      throw error;
    }
  }

  /**
   * Load a specific .env file if it exists
   */
  loadFile(filename) {
    const filePath = path.join(this.rootPath, filename);
    
    if (fs.existsSync(filePath)) {
      require('dotenv').config({ path: filePath });
      this.loadedFiles.push(filename);
    }
  }

  /**
   * Get configuration object with validation
   */
  getConfig() {
    const config = {
      // Application
      NODE_ENV: this.getRequired('NODE_ENV'),
      APP_NAME: this.getRequired('APP_NAME'),
      APP_VERSION: this.getRequired('APP_VERSION'),
      
      // Ports (Fixed architecture - DO NOT CHANGE)
      API_GATEWAY_PORT: this.getNumber('API_GATEWAY_PORT', 3000),
      USER_SERVICE_PORT: this.getNumber('USER_SERVICE_PORT', 3001),
      GENERATION_SERVICE_PORT: this.getNumber('GENERATION_SERVICE_PORT', 3002),
      HISTORY_SERVICE_PORT: this.getNumber('HISTORY_SERVICE_PORT', 3003),
      SHARING_SERVICE_PORT: this.getNumber('SHARING_SERVICE_PORT', 3004),
      VIDEO_SERVICE_PORT: this.getNumber('VIDEO_SERVICE_PORT', 3005),
      SOCIAL_SERVICE_PORT: this.getNumber('SOCIAL_SERVICE_PORT', 3006),
      FRONTEND_PORT: this.getNumber('FRONTEND_PORT', 3007),
      
      // Database
      POSTGRES_DB: this.getRequired('POSTGRES_DB'),
      POSTGRES_USER: this.getRequired('POSTGRES_USER'),
      POSTGRES_PASSWORD: this.getRequired('POSTGRES_PASSWORD'),
      POSTGRES_HOST: this.get('POSTGRES_HOST', 'localhost'),
      POSTGRES_PORT: this.getNumber('POSTGRES_PORT', 5432),
      
      MONGODB_URI: this.getRequired('MONGODB_URI'),
      MONGODB_HOST: this.get('MONGODB_HOST', 'localhost'),
      MONGODB_PORT: this.getNumber('MONGODB_PORT', 27017),
      MONGODB_DB: this.get('MONGODB_DB', 'what_if_history'),
      MONGODB_USER: this.get('MONGODB_USER', 'admin'),
      MONGODB_PASSWORD: this.get('MONGODB_PASSWORD', 'admin123'),
      
      // Redis Configuration
      REDIS_URL: this.get('REDIS_URL'),
      REDIS_HOST: this.get('REDIS_HOST', 'localhost'),
      REDIS_PORT: this.getNumber('REDIS_PORT', 6379),
      REDIS_PASSWORD: this.get('REDIS_PASSWORD'),
      
      // JWT
      JWT_SECRET: this.getRequired('JWT_SECRET'),
      JWT_EXPIRES_IN: this.get('JWT_EXPIRES_IN', '24h'),
      JWT_REFRESH_EXPIRES_IN: this.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      
      // Service URLs
      USER_SERVICE_URL: this.getRequired('USER_SERVICE_URL'),
      GENERATION_SERVICE_URL: this.getRequired('GENERATION_SERVICE_URL'),
      HISTORY_SERVICE_URL: this.getRequired('HISTORY_SERVICE_URL'),
      SHARING_SERVICE_URL: this.getRequired('SHARING_SERVICE_URL'),
      VIDEO_SERVICE_URL: this.getRequired('VIDEO_SERVICE_URL'),
      SOCIAL_SERVICE_URL: this.getRequired('SOCIAL_SERVICE_URL'),
      
      // Frontend
      FRONTEND_URL: this.getRequired('FRONTEND_URL'),
      REACT_APP_API_URL: this.getRequired('REACT_APP_API_URL'),
      REACT_APP_ENVIRONMENT: this.getRequired('REACT_APP_ENVIRONMENT'),
      
      // AI Providers
      AI_PROVIDER: this.get('AI_PROVIDER', 'gemini'),
      GEMINI_API_KEY: this.get('GEMINI_API_KEY'),
      OPENAI_API_KEY: this.get('OPENAI_API_KEY'),
      ANTHROPIC_API_KEY: this.get('ANTHROPIC_API_KEY'),
      
      // Video Service
      GOOGLE_CLOUD_PROJECT_ID: this.get('GOOGLE_CLOUD_PROJECT_ID'),
      RUNWAY_API_KEY: this.get('RUNWAY_API_KEY'),
      PIKA_API_KEY: this.get('PIKA_API_KEY'),
      STABILITY_API_KEY: this.get('STABILITY_API_KEY'),
      
      // Feature Flags
      ENABLE_VIDEO_GENERATION: this.getBoolean('ENABLE_VIDEO_GENERATION', true),
      ENABLE_TTS: this.getBoolean('ENABLE_TTS', true),
      ENABLE_SOCIAL_FEATURES: this.getBoolean('ENABLE_SOCIAL_FEATURES', true),
      ENABLE_ANALYTICS: this.getBoolean('ENABLE_ANALYTICS', true),
      ENABLE_DEBUG_MODE: this.getBoolean('ENABLE_DEBUG_MODE', false),
      ENABLE_SWAGGER_UI: this.getBoolean('ENABLE_SWAGGER_UI', true),
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
      RATE_LIMIT_MAX_REQUESTS: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: this.getBoolean('RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS', false),
      
      // File Management
      MAX_FILE_SIZE_MB: this.getNumber('MAX_FILE_SIZE_MB', 50),
      CLEANUP_INTERVAL_HOURS: this.getNumber('CLEANUP_INTERVAL_HOURS', 24),
      UPLOAD_PATH: this.get('UPLOAD_PATH', './uploads'),
      OUTPUT_PATH: this.get('OUTPUT_PATH', './outputs'),
      
      // Logging
      LOG_LEVEL: this.get('LOG_LEVEL', 'info'),
      LOG_REQUESTS: this.getBoolean('LOG_REQUESTS', true),
      LOG_ERRORS: this.getBoolean('LOG_ERRORS', true),
      LOG_DIR: this.get('LOG_DIR', './logs'),
      
      // CORS
      CORS_ORIGIN: this.get('CORS_ORIGIN', 'http://localhost:3007'),
      CORS_CREDENTIALS: this.getBoolean('CORS_CREDENTIALS', true),
      
      // Security
      HELMET_CSP_ENABLED: this.getBoolean('HELMET_CSP_ENABLED', true),
      HELMET_HSTS_ENABLED: this.getBoolean('HELMET_HSTS_ENABLED', true),
      HELMET_NO_SNIFF: this.getBoolean('HELMET_NO_SNIFF', true),
      HELMET_XSS_FILTER: this.getBoolean('HELMET_XSS_FILTER', true),
      
      // Health Check
      HEALTH_CHECK_INTERVAL: this.getNumber('HEALTH_CHECK_INTERVAL', 30000),
      HEALTH_CHECK_TIMEOUT: this.getNumber('HEALTH_CHECK_TIMEOUT', 5000),
      
      // Cache
      CACHE_TTL: this.getNumber('CACHE_TTL', 3600),
      CACHE_MAX_ITEMS: this.getNumber('CACHE_MAX_ITEMS', 1000),
      
      // Monitoring
      ENABLE_METRICS: this.getBoolean('ENABLE_METRICS', true),
      METRICS_PORT: this.getNumber('METRICS_PORT', 9090),
      ENABLE_TRACING: this.getBoolean('ENABLE_TRACING', true),
      TRACE_SAMPLE_RATE: this.getNumber('TRACE_SAMPLE_RATE', 0.1),
      
      // AWS Configuration
      AWS_REGION: this.get('AWS_REGION', 'us-east-1'),
      AWS_ACCESS_KEY_ID: this.get('AWS_ACCESS_KEY_ID'),
      AWS_SECRET_ACCESS_KEY: this.get('AWS_SECRET_ACCESS_KEY'),
      
      // RDS PostgreSQL Configuration (Test/Production)
      RDS_POSTGRES_HOST: this.get('RDS_POSTGRES_HOST'),
      RDS_POSTGRES_PORT: this.getNumber('RDS_POSTGRES_PORT', 5432),
      RDS_POSTGRES_DB: this.get('RDS_POSTGRES_DB'),
      RDS_POSTGRES_USER: this.get('RDS_POSTGRES_USER'),
      RDS_POSTGRES_PASSWORD: this.get('RDS_POSTGRES_PASSWORD'),
      
      // DynamoDB Configuration
      DYNAMODB_ENDPOINT: this.get('DYNAMODB_ENDPOINT'), // For local development
      DYNAMODB_REGION: this.get('DYNAMODB_REGION', 'us-east-1'),
      
      // ElastiCache Redis Configuration (Test/Production)
      ELASTICACHE_REDIS_HOST: this.get('ELASTICACHE_REDIS_HOST'),
      ELASTICACHE_REDIS_PORT: this.getNumber('ELASTICACHE_REDIS_PORT', 6379),
      ELASTICACHE_REDIS_PASSWORD: this.get('ELASTICACHE_REDIS_PASSWORD'),
      
      // S3 Configuration
      S3_BUCKET: this.get('S3_BUCKET'),
      S3_REGION: this.get('S3_REGION', 'us-east-1'),
      S3_ACCESS_KEY_ID: this.get('S3_ACCESS_KEY_ID'),
      S3_SECRET_ACCESS_KEY: this.get('S3_SECRET_ACCESS_KEY'),
      
      // CloudWatch Configuration
      CLOUDWATCH_GROUP: this.get('CLOUDWATCH_GROUP'),
      CLOUDWATCH_STREAM: this.get('CLOUDWATCH_STREAM'),
      
      // X-Ray Configuration
      XRAY_ENABLED: this.getBoolean('XRAY_ENABLED', true),
      XRAY_SAMPLE_RATE: this.getNumber('XRAY_SAMPLE_RATE', 0.1),
      
      // CloudTrail Configuration
      CLOUDTRAIL_ENABLED: this.getBoolean('CLOUDTRAIL_ENABLED', true),
      
      // CDN Configuration
      CDN_URL: this.get('CDN_URL'),
      STATIC_ASSETS_URL: this.get('STATIC_ASSETS_URL'),
    };

    // Validate configuration
    this.validateConfig(config);
    
    return config;
  }

  /**
   * Get environment variable with default value
   */
  get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  /**
   * Get required environment variable (throws if missing)
   */
  getRequired(key) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get environment variable as number
   */
  getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
    }
    return num;
  }

  /**
   * Get environment variable as boolean
   */
  getBoolean(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * Validate critical configuration
   */
  validateConfig(config) {
    const errors = [];

    // Validate ports are in correct range
    const ports = [
      'API_GATEWAY_PORT', 'USER_SERVICE_PORT', 'GENERATION_SERVICE_PORT',
      'HISTORY_SERVICE_PORT', 'SHARING_SERVICE_PORT', 'VIDEO_SERVICE_PORT'
    ];
    
    ports.forEach(portKey => {
      if (config[portKey] < 1000 || config[portKey] > 65535) {
        errors.push(`${portKey} must be between 1000 and 65535, got: ${config[portKey]}`);
      }
    });

    // Validate JWT secret in production
    if (config.NODE_ENV === 'production' && config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET must be changed in production environment');
    }

    // Validate required API keys based on AI provider
    if (config.AI_PROVIDER === 'gemini' && !config.GEMINI_API_KEY) {
      errors.push('GEMINI_API_KEY is required when AI_PROVIDER is gemini');
    }

    if (config.ENABLE_VIDEO_GENERATION && !config.RUNWAY_API_KEY && !config.PIKA_API_KEY && !config.STABILITY_API_KEY) {
      errors.push('At least one video API key is required when ENABLE_VIDEO_GENERATION is true');
    }

    // Validate AWS configuration for test/production environments
    if (config.NODE_ENV === 'test' || config.NODE_ENV === 'production') {
      if (!config.AWS_REGION) {
        errors.push('AWS_REGION is required for test/production environments');
      }
      if (!config.RDS_POSTGRES_HOST) {
        errors.push('RDS_POSTGRES_HOST is required for test/production environments');
      }
      if (!config.RDS_POSTGRES_DB) {
        errors.push('RDS_POSTGRES_DB is required for test/production environments');
      }
      if (!config.RDS_POSTGRES_USER) {
        errors.push('RDS_POSTGRES_USER is required for test/production environments');
      }
      if (!config.RDS_POSTGRES_PASSWORD) {
        errors.push('RDS_POSTGRES_PASSWORD is required for test/production environments');
      }
      if (!config.ELASTICACHE_REDIS_HOST) {
        errors.push('ELASTICACHE_REDIS_HOST is required for test/production environments');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get database connection string
   */
  getDatabaseUrl(type = 'postgres') {
    if (type === 'postgres') {
      return `postgresql://${this.getRequired('POSTGRES_USER')}:${this.getRequired('POSTGRES_PASSWORD')}@${this.get('POSTGRES_HOST')}:${this.getNumber('POSTGRES_PORT')}/${this.getRequired('POSTGRES_DB')}`;
    } else if (type === 'mongodb') {
      return this.getRequired('MONGODB_URI');
    } else if (type === 'redis') {
      return this.getRequired('REDIS_URL');
    }
    throw new Error(`Unknown database type: ${type}`);
  }

  /**
   * Check if running in specific environment
   */
  isDevelopment() {
    return this.env === 'development';
  }

  isTest() {
    return this.env === 'test';
  }

  isProduction() {
    return this.env === 'production';
  }
}

// Create singleton instance
const envLoader = new EnvironmentLoader();

// Load environment on module import
const config = envLoader.load();

module.exports = {
  config,
  envLoader,
  // Convenience methods
  isDevelopment: () => envLoader.isDevelopment(),
  isTest: () => envLoader.isTest(),
  isProduction: () => envLoader.isProduction(),
  getDatabaseUrl: (type) => envLoader.getDatabaseUrl(type),
};