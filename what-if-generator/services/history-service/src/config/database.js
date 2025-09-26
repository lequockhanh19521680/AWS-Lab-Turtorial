const { createTables, healthCheck, isDevelopment } = require('../../../../shared/config/dynamodb');

/**
 * History Service Database Configuration
 * Migrated from MongoDB to DynamoDB for AWS integration
 */

const connectDB = async () => {
  try {
    const envInfo = isDevelopment() ? 'Local DynamoDB' : 'AWS DynamoDB';
    console.log(`🔧 Connecting to DynamoDB (${envInfo})...`);

    // Create tables for local development
    if (isDevelopment()) {
      await createTables();
      console.log('✅ DynamoDB tables created/verified');
    }

    // Health check
    const health = await healthCheck();
    if (health.status === 'healthy') {
      console.log(`✅ DynamoDB connected successfully (${envInfo})`);
      console.log(`📊 Available tables: ${health.tables.join(', ')}`);
    } else {
      throw new Error(`DynamoDB health check failed: ${health.error}`);
    }

    return health;
  } catch (error) {
    console.error('❌ DynamoDB connection failed:', error);
    
    if (isDevelopment()) {
      console.error('🔍 Local DynamoDB Debug Info:');
      console.error('   Make sure DynamoDB Local is running on port 8000');
      console.error('   Start with: docker run -p 8000:8000 amazon/dynamodb-local');
    } else {
      console.error('🔍 AWS DynamoDB Debug Info:');
      console.error('   Check AWS credentials and permissions');
      console.error('   Verify tables exist in AWS console');
    }
    
    process.exit(1);
  }
};

// Graceful close (DynamoDB doesn't require explicit connection closing)
const closeDB = async () => {
  try {
    console.log('✅ DynamoDB connection closed');
    return { success: true };
  } catch (error) {
    console.error('❌ Error closing DynamoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  closeDB
};