const redis = require('redis');
const { config } = require('../../../shared/config/env');

let client;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: config.REDIS_URL
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
    process.exit(1);
  }
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return client;
};

module.exports = {
  connectRedis,
  getRedisClient
};