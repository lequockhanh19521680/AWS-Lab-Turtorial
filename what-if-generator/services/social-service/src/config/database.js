const mongoose = require('mongoose');
const logger = require('./logger');

const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/what_if_social?authSource=admin';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
};

module.exports = { connectDatabase };