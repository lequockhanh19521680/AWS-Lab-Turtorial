/**
 * Simplified Environment Configuration Loader
 * Replaces the complex env.js with a cleaner, more maintainable approach
 */

const path = require('path');
require('dotenv').config(); // Load .env files automatically

class SimpleEnvironmentLoader {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.loadEnvironmentFiles();
  }

  /**
   * Load environment files in the correct order
   */
  loadEnvironmentFiles() {
    const envFiles = [
      '.env',                    // Global defaults
      `.env.${this.env}`,        // Environment-specific
      '.env.local'               // Local overrides (gitignored)
    ];

    const rootPath = path.resolve(__dirname, '../../');
    
    envFiles.forEach(file => {
      try {
        require('dotenv').config({ path: path.join(rootPath, file) });
      } catch (error) {
        // File doesn't exist, continue
      }
    });
  }

  /**
   * Get configuration with validation and defaults
   */
  getConfig() {
    return {
      // Application
      NODE_ENV: this.env,
      APP_NAME: process.env.APP_NAME || 'what-if-generator',
      APP_VERSION: process.env.APP_VERSION || '1.0.0',
      
      // Service Ports (Fixed Architecture)
      API_GATEWAY_PORT: this.getNumber('API_GATEWAY_PORT', 3000),
      USER_SERVICE_PORT: this.getNumber('USER_SERVICE_PORT', 3001),
      GENERATION_SERVICE_PORT: this.getNumber('GENERATION_SERVICE_PORT', 3002),
      HISTORY_SERVICE_PORT: this.getNumber('HISTORY_SERVICE_PORT', 3003),
      SHARING_SERVICE_PORT: this.getNumber('SHARING_SERVICE_PORT', 3004),
      VIDEO_SERVICE_PORT: this.getNumber('VIDEO_SERVICE_PORT', 3005),
      SOCIAL_SERVICE_PORT: this.getNumber('SOCIAL_SERVICE_PORT', 3006),
      FRONTEND_PORT: this.getNumber('FRONTEND_PORT', 3007),
      
      // Service URLs
      USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      GENERATION_SERVICE_URL: process.env.GENERATION_SERVICE_URL || 'http://localhost:3002',
      HISTORY_SERVICE_URL: process.env.HISTORY_SERVICE_URL || 'http://localhost:3003',
      SHARING_SERVICE_URL: process.env.SHARING_SERVICE_URL || 'http://localhost:3004',
      VIDEO_SERVICE_URL: process.env.VIDEO_SERVICE_URL || 'http://localhost:3005',
      SOCIAL_SERVICE_URL: process.env.SOCIAL_SERVICE_URL || 'http://localhost:3006',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3007',
      
      // Frontend
      REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
      REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || this.env,
      
      // Database
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
      POSTGRES_PORT: this.getNumber('POSTGRES_PORT', 5432),
      POSTGRES_DB: process.env.POSTGRES_DB || 'what_if_users',
      POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'postgres123',
      
      // AWS RDS (Test/Production)
      RDS_POSTGRES_HOST: process.env.RDS_POSTGRES_HOST,
      RDS_POSTGRES_PORT: this.getNumber('RDS_POSTGRES_PORT', 5432),
      RDS_POSTGRES_DB: process.env.RDS_POSTGRES_DB,
      RDS_POSTGRES_USER: process.env.RDS_POSTGRES_USER,
      RDS_POSTGRES_PASSWORD: process.env.RDS_POSTGRES_PASSWORD,
      
      // DynamoDB
      DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
      DYNAMODB_REGION: process.env.DYNAMODB_REGION || 'us-east-1',
      
      // Redis
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: this.getNumber('REDIS_PORT', 6379),
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      
      // AWS ElastiCache (Test/Production)
      ELASTICACHE_REDIS_HOST: process.env.ELASTICACHE_REDIS_HOST,
      ELASTICACHE_REDIS_PORT: this.getNumber('ELASTICACHE_REDIS_PORT', 6379),
      ELASTICACHE_REDIS_PASSWORD: process.env.ELASTICACHE_REDIS_PASSWORD,
      
      // Security
      JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret-in-production',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      
      // AI Providers
      AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      
      // Video Service
      GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      RUNWAY_API_KEY: process.env.RUNWAY_API_KEY,
      PIKA_API_KEY: process.env.PIKA_API_KEY,
      STABILITY_API_KEY: process.env.STABILITY_API_KEY,
      
      // Feature Flags
      ENABLE_VIDEO_GENERATION: this.getBoolean('ENABLE_VIDEO_GENERATION', true),
      ENABLE_TTS: this.getBoolean('ENABLE_TTS', true),
      ENABLE_SOCIAL_FEATURES: this.getBoolean('ENABLE_SOCIAL_FEATURES', true),
      ENABLE_ANALYTICS: this.getBoolean('ENABLE_ANALYTICS', true),
      ENABLE_DEBUG_MODE: this.getBoolean('ENABLE_DEBUG_MODE', false),
      ENABLE_SWAGGER_UI: this.getBoolean('ENABLE_SWAGGER_UI', true),
      ENABLE_API_DOCS: this.getBoolean('ENABLE_API_DOCS', true),
      ENABLE_METRICS: this.getBoolean('ENABLE_METRICS', true),
      ENABLE_TRACING: this.getBoolean('ENABLE_TRACING', true),
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
      RATE_LIMIT_MAX_REQUESTS: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: this.getBoolean('RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS', false),
      
      // File Management
      MAX_FILE_SIZE_MB: this.getNumber('MAX_FILE_SIZE_MB', 50),
      CLEANUP_INTERVAL_HOURS: this.getNumber('CLEANUP_INTERVAL_HOURS', 24),
      UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
      OUTPUT_PATH: process.env.OUTPUT_PATH || './outputs',
      
      // Logging
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      LOG_REQUESTS: this.getBoolean('LOG_REQUESTS', true),
      LOG_ERRORS: this.getBoolean('LOG_ERRORS', true),
      LOG_DIR: process.env.LOG_DIR || './logs',
      
      // CORS
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3007',
      CORS_CREDENTIALS: this.getBoolean('CORS_CREDENTIALS', true),
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3007,http://localhost:3000',
      
      // Security Headers
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
      
      // AWS
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      
      // S3
      S3_BUCKET: process.env.S3_BUCKET,
      S3_REGION: process.env.S3_REGION || 'us-east-1',
      
      // CloudWatch
      CLOUDWATCH_GROUP: process.env.CLOUDWATCH_GROUP,
      CLOUDWATCH_STREAM: process.env.CLOUDWATCH_STREAM,
      
      // X-Ray
      XRAY_ENABLED: this.getBoolean('XRAY_ENABLED', true),
      XRAY_SAMPLE_RATE: this.getNumber('XRAY_SAMPLE_RATE', 0.1),
      
      // CloudTrail
      CLOUDTRAIL_ENABLED: this.getBoolean('CLOUDTRAIL_ENABLED', true),
      
      // CDN
      CDN_URL: process.env.CDN_URL,
      STATIC_ASSETS_URL: process.env.STATIC_ASSETS_URL,
      
      // OAuth
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
      FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
      
      // Session
      SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-session-secret',
      SESSION_MAX_AGE: this.getNumber('SESSION_MAX_AGE', 86400000),
      
      // Email
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
      EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@whatifgenerator.com',
      EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
      EMAIL_SMTP_PORT: this.getNumber('EMAIL_SMTP_PORT', 587),
      
      // API Documentation
      API_DOCS_PATH: process.env.API_DOCS_PATH || '/api-docs',
      METRICS_PATH: process.env.METRICS_PATH || '/metrics',
      METRICS_PORT: this.getNumber('METRICS_PORT', 9090),
      TRACE_SAMPLE_RATE: this.getNumber('TRACE_SAMPLE_RATE', 0.1)
    };
  }

  /**
   * Get environment variable as number
   */
  getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      console.warn(`Environment variable ${key} is not a valid number: ${value}. Using default: ${defaultValue}`);
      return defaultValue;
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

  isAWSEnvironment() {
    return this.env === 'test' || this.env === 'production';
  }

  /**
   * Get database URL for specific database type
   */
  getDatabaseUrl(type) {
    const config = this.getConfig();
    
    switch (type) {
      case 'postgres':
        if (this.isAWSEnvironment()) {
          return `postgresql://${config.RDS_POSTGRES_USER}:${config.RDS_POSTGRES_PASSWORD}@${config.RDS_POSTGRES_HOST}:${config.RDS_POSTGRES_PORT}/${config.RDS_POSTGRES_DB}`;
        } else {
          return `postgresql://${config.POSTGRES_USER}:${config.POSTGRES_PASSWORD}@${config.POSTGRES_HOST}:${config.POSTGRES_PORT}/${config.POSTGRES_DB}`;
        }
      
      case 'redis':
        if (this.isAWSEnvironment()) {
          const auth = config.ELASTICACHE_REDIS_PASSWORD ? `:${config.ELASTICACHE_REDIS_PASSWORD}@` : '';
          return `redis://${auth}${config.ELASTICACHE_REDIS_HOST}:${config.ELASTICACHE_REDIS_PORT}`;
        } else {
          return config.REDIS_URL;
        }
      
      default:
        throw new Error(`Unknown database type: ${type}`);
    }
  }

  /**
   * Validate critical configuration
   */
  validateConfig() {
    const config = this.getConfig();
    const errors = [];

    // Validate JWT secret in production
    if (this.isProduction() && (
      config.JWT_SECRET === 'change-this-secret-in-production' ||
      config.JWT_SECRET.length < 32
    )) {
      errors.push('JWT_SECRET must be a secure random string (32+ characters) in production');
    }

    // Validate required AWS configuration for test/production
    if (this.isAWSEnvironment()) {
      const requiredAWSVars = [
        'AWS_REGION',
        'RDS_POSTGRES_HOST',
        'RDS_POSTGRES_DB',
        'RDS_POSTGRES_USER',
        'ELASTICACHE_REDIS_HOST'
      ];

      requiredAWSVars.forEach(varName => {
        if (!config[varName]) {
          errors.push(`${varName} is required for ${this.env} environment`);
        }
      });
    }

    // Validate AI provider configuration
    if (config.AI_PROVIDER === 'gemini' && !config.GEMINI_API_KEY) {
      errors.push('GEMINI_API_KEY is required when AI_PROVIDER is gemini');
    }

    if (errors.length > 0) {
      console.error('Configuration Validation Errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      
      if (this.isProduction()) {
        throw new Error('Configuration validation failed in production environment');
      } else {
        console.warn('Configuration warnings detected. Please review your environment settings.');
      }
    }

    return config;
  }
}

// Create singleton instance
const simpleEnvLoader = new SimpleEnvironmentLoader();
const config = simpleEnvLoader.validateConfig();

module.exports = {
  config,
  envLoader: simpleEnvLoader,
  // Convenience methods
  isDevelopment: () => simpleEnvLoader.isDevelopment(),
  isTest: () => simpleEnvLoader.isTest(),
  isProduction: () => simpleEnvLoader.isProduction(),
  isAWSEnvironment: () => simpleEnvLoader.isAWSEnvironment(),
  getDatabaseUrl: (type) => simpleEnvLoader.getDatabaseUrl(type)
};