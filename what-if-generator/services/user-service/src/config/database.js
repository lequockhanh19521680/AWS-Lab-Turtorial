const { Sequelize } = require('sequelize');
const { getPostgreSQLConfig, isAWSEnvironment, isDevelopment } = require('../../../../shared/config/database');

/**
 * User Service Database Configuration
 * Supports multi-environment setup:
 * - Development: Local PostgreSQL
 * - Test/Production: AWS RDS PostgreSQL
 */

const dbConfig = getPostgreSQLConfig();
const sequelize = new Sequelize(dbConfig);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    
    const envInfo = isAWSEnvironment() ? 'AWS RDS' : 'Local';
    console.log(`✅ PostgreSQL connected successfully (${envInfo})`);
    
    // Sync database in development only
    if (isDevelopment()) {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized (development mode)');
    } else {
      console.log('ℹ️ Database sync skipped in production environment');
    }
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error);
    
    // Enhanced error logging for AWS environments
    if (isAWSEnvironment()) {
      console.error('🔍 AWS RDS Connection Debug Info:');
      console.error(`   Host: ${dbConfig.host}`);
      console.error(`   Port: ${dbConfig.port}`);
      console.error(`   Database: ${dbConfig.database}`);
      console.error(`   Username: ${dbConfig.username}`);
      console.error(`   SSL Required: ${dbConfig.dialectOptions?.ssl?.require || false}`);
    }
    
    process.exit(1);
  }
};

// Graceful shutdown
const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('✅ PostgreSQL connection closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL connection:', error);
  }
};

module.exports = {
  sequelize,
  connectDB,
  closeDB
};