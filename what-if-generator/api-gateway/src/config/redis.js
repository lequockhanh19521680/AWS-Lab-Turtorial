const redis = require('redis');
require('dotenv').config();

let client;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    // Don't exit process for API Gateway, Redis is optional
    console.warn('⚠️ Continuing without Redis (caching and rate limiting will be disabled)');
    return null;
  }
};

const getRedisClient = () => {
  return client;
};

const isRedisConnected = () => {
  return client && client.isOpen;
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected
};