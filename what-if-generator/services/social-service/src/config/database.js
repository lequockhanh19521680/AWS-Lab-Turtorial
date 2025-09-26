const { createTables, healthCheck, isDevelopment } = require('../../../../shared/config/dynamodb');
const logger = require('./logger');

/**
 * Social Service Database Configuration
 * Migrated from MongoDB to DynamoDB for AWS integration
 */

const connectDatabase = async () => {
  try {
    const envInfo = isDevelopment() ? 'Local DynamoDB' : 'AWS DynamoDB';
    logger.info(`Connecting to DynamoDB (${envInfo})...`);

    // Create tables for local development
    if (isDevelopment()) {
      await createTables();
      logger.info('DynamoDB tables created/verified');
    }

    // Health check
    const health = await healthCheck();
    if (health.status === 'healthy') {
      logger.info(`DynamoDB connected successfully (${envInfo})`, {
        tables: health.tables,
        environment: health.environment
      });
    } else {
      throw new Error(`DynamoDB health check failed: ${health.error}`);
    }

    return health;
  } catch (error) {
    logger.error('DynamoDB connection failed', { error: error.message });
    
    if (isDevelopment()) {
      logger.error('Local DynamoDB Debug Info', {
        message: 'Make sure DynamoDB Local is running on port 8000',
        command: 'docker run -p 8000:8000 amazon/dynamodb-local'
      });
    } else {
      logger.error('AWS DynamoDB Debug Info', {
        message: 'Check AWS credentials and permissions',
        suggestion: 'Verify tables exist in AWS console'
      });
    }
    
    throw error;
  }
};

module.exports = { connectDatabase };