import { Pool, PoolConfig } from 'pg';
import { DatabaseConfig } from '@/types';

/**
 * User Service Database Configuration
 * Supports multi-environment setup:
 * - Development: Local PostgreSQL or AWS RDS
 * - Test/Production: AWS RDS PostgreSQL
 */

const isAWSEnvironment = (): boolean => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' || env === 'test';
};

const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

const getPostgreSQLConfig = (): PoolConfig => {
  const config: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'what_if_users',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Configure SSL for AWS environments
  if (isAWSEnvironment()) {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  return config;
};

// Create PostgreSQL pool
const dbConfig = getPostgreSQLConfig();
const pool = new Pool(dbConfig);

// Connection event handlers
pool.on('connect', (client) => {
  console.log('🔌 New PostgreSQL client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
});

const connectDB = async (): Promise<void> => {
  try {
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    const envInfo = isAWSEnvironment() ? 'AWS RDS' : 'Local';
    console.log(`✅ PostgreSQL connected successfully (${envInfo})`);
    
    // Log connection info for debugging (without sensitive data)
    console.log(`🔍 Database Connection Info:`);
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);
    
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error);
    
    // Enhanced error logging for AWS environments
    if (isAWSEnvironment()) {
      console.error('🔍 AWS RDS Connection Debug Info:');
      console.error(`   Host: ${dbConfig.host}`);
      console.error(`   Port: ${dbConfig.port}`);
      console.error(`   Database: ${dbConfig.database}`);
      console.error(`   User: ${dbConfig.user}`);
      console.error(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);
    }
    
    throw error;
  }
};

// Graceful shutdown
const closeDB = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ PostgreSQL connection pool closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL connection pool:', error);
    throw error;
  }
};

// Helper function to get a database client
const getDBClient = async () => {
  return pool.connect();
};

// Query helper function with better error handling
const query = async (text: string, params?: unknown[]): Promise<unknown> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  } finally {
    client.release();
  }
};

// Transaction helper
const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export {
  pool,
  connectDB,
  closeDB,
  getDBClient,
  query,
  transaction,
  isAWSEnvironment,
  isDevelopment
};