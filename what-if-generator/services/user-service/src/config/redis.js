// This file has been replaced with shared Redis configuration
// Keeping this file for backward compatibility during migration

const { connect, getClient, healthCheck } = require('../../../../shared/config/redis');

const connectRedis = async () => {
  try {
    const client = await connect();
    return client;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }
};

const getRedisClient = () => {
  return getClient();
};

module.exports = {
  connectRedis,
  getRedisClient
};