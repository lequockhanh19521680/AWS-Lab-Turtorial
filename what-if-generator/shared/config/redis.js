/**
 * Multi-Environment Redis Configuration
 * Supports local Redis for development and AWS ElastiCache for test/production
 */

const redis = require('redis');
const { getRedisConfig, isAWSEnvironment, isDevelopment } = require('./database');

class RedisClient {
  constructor() {
    this.config = getRedisConfig();
    this.client = null;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      const envInfo = isAWSEnvironment() ? 'AWS ElastiCache' : 'Local Redis';
      console.log(`🔧 Connecting to Redis (${envInfo})...`);

      // Create Redis client with environment-specific configuration
      this.client = redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        retryDelayOnFailover: this.config.retryDelayOnFailover || 100,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
        // TLS configuration for AWS ElastiCache
        ...(isAWSEnvironment() && this.config.tls ? { tls: this.config.tls } : {})
      });

      // Event handlers
      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log(`✅ Redis connected successfully (${envInfo})`);
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready');
      });

      this.client.on('end', () => {
        console.log('⚠️ Redis connection ended');
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      
      if (isAWSEnvironment()) {
        console.error('🔍 AWS ElastiCache Debug Info:');
        console.error(`   Host: ${this.config.host}`);
        console.error(`   Port: ${this.config.port}`);
        console.error('   Check security groups and subnet groups');
        console.error('   Verify ElastiCache cluster is running');
      } else {
        console.error('🔍 Local Redis Debug Info:');
        console.error(`   Host: ${this.config.host}`);
        console.error(`   Port: ${this.config.port}`);
        console.error('   Make sure Redis server is running locally');
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        console.log('✅ Redis disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return { status: 'disconnected', error: 'Client not initialized' };
      }

      const pong = await this.client.ping();
      return {
        status: pong === 'PONG' ? 'healthy' : 'unhealthy',
        response: pong,
        environment: isAWSEnvironment() ? 'aws' : 'local'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        environment: isAWSEnvironment() ? 'aws' : 'local'
      };
    }
  }

  /**
   * Cache operations with error handling
   */
  async set(key, value, ttl = null) {
    try {
      if (ttl) {
        return await this.client.setEx(key, ttl, JSON.stringify(value));
      } else {
        return await this.client.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      throw error;
    }
  }

  async expire(key, ttl) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      throw error;
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS error:', error);
      throw error;
    }
  }

  async flushdb() {
    try {
      return await this.client.flushDb();
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      throw error;
    }
  }

  /**
   * Session management helpers
   */
  async setSession(sessionId, sessionData, ttl = 86400) { // 24 hours default
    return await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`);
  }

  /**
   * Cache helpers for API responses
   */
  async cacheApiResponse(cacheKey, data, ttl = 3600) { // 1 hour default
    return await this.set(`api:${cacheKey}`, data, ttl);
  }

  async getCachedApiResponse(cacheKey) {
    return await this.get(`api:${cacheKey}`);
  }

  async invalidateApiCache(pattern) {
    const keys = await this.keys(`api:${pattern}`);
    if (keys.length > 0) {
      return await this.client.del(keys);
    }
    return 0;
  }

  /**
   * Rate limiting helpers
   */
  async incrementRateLimit(key, ttl = 3600) {
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, ttl);
      }
      return current;
    } catch (error) {
      console.error('Redis rate limit increment error:', error);
      throw error;
    }
  }

  async getRateLimit(key) {
    try {
      return await this.client.get(key) || 0;
    } catch (error) {
      console.error('Redis rate limit get error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = {
  redisClient,
  RedisClient,
  // Convenience methods
  connect: () => redisClient.connect(),
  disconnect: () => redisClient.disconnect(),
  getClient: () => redisClient.getClient(),
  healthCheck: () => redisClient.healthCheck(),
  // Cache operations
  set: (key, value, ttl) => redisClient.set(key, value, ttl),
  get: (key) => redisClient.get(key),
  del: (key) => redisClient.del(key),
  exists: (key) => redisClient.exists(key),
  expire: (key, ttl) => redisClient.expire(key, ttl),
  keys: (pattern) => redisClient.keys(pattern),
  flushdb: () => redisClient.flushdb(),
  // Session management
  setSession: (sessionId, sessionData, ttl) => redisClient.setSession(sessionId, sessionData, ttl),
  getSession: (sessionId) => redisClient.getSession(sessionId),
  deleteSession: (sessionId) => redisClient.deleteSession(sessionId),
  // API caching
  cacheApiResponse: (cacheKey, data, ttl) => redisClient.cacheApiResponse(cacheKey, data, ttl),
  getCachedApiResponse: (cacheKey) => redisClient.getCachedApiResponse(cacheKey),
  invalidateApiCache: (pattern) => redisClient.invalidateApiCache(pattern),
  // Rate limiting
  incrementRateLimit: (key, ttl) => redisClient.incrementRateLimit(key, ttl),
  getRateLimit: (key) => redisClient.getRateLimit(key)
};