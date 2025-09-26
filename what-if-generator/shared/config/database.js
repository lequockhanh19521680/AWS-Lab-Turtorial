/**
 * Multi-Environment Database Configuration
 * Supports PostgreSQL (local/dev) and AWS RDS PostgreSQL (test/prod)
 * Supports DynamoDB for all environments
 */

const { config } = require('./env');

class DatabaseConfig {
  constructor() {
    this.env = config.NODE_ENV;
  }

  /**
   * Get PostgreSQL connection configuration
   * Dev: Local PostgreSQL
   * Test/Prod: AWS RDS PostgreSQL
   */
  getPostgreSQLConfig() {
    const isAWS = this.env === 'test' || this.env === 'production';
    
    if (isAWS) {
      // AWS RDS Configuration
      return {
        host: config.RDS_POSTGRES_HOST,
        port: config.RDS_POSTGRES_PORT || 5432,
        database: config.RDS_POSTGRES_DB,
        username: config.RDS_POSTGRES_USER,
        password: config.RDS_POSTGRES_PASSWORD,
        dialect: 'postgres',
        logging: config.LOG_LEVEL === 'debug' ? console.log : false,
        pool: {
          max: 20,
          min: 5,
          acquire: 60000,
          idle: 10000
        },
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        },
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          },
          connectTimeout: 60000,
          requestTimeout: 60000
        }
      };
    } else {
      // Local Development Configuration
      return {
        host: config.POSTGRES_HOST || 'localhost',
        port: config.POSTGRES_PORT || 5432,
        database: config.POSTGRES_DB,
        username: config.POSTGRES_USER,
        password: config.POSTGRES_PASSWORD,
        dialect: 'postgres',
        logging: console.log,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      };
    }
  }

  /**
   * Get DynamoDB configuration
   * All environments use DynamoDB (local DynamoDB for dev)
   */
  getDynamoDBConfig() {
    const isLocal = this.env === 'development';
    
    if (isLocal) {
      // Local DynamoDB for development
      return {
        region: 'us-east-1',
        endpoint: config.DYNAMODB_ENDPOINT || 'http://localhost:8000',
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy',
        apiVersion: '2012-08-10'
      };
    } else {
      // AWS DynamoDB for test/production
      return {
        region: config.AWS_REGION,
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        apiVersion: '2012-08-10'
      };
    }
  }

  /**
   * Get DynamoDB table configurations
   */
  getDynamoDBTables() {
    return {
      // History Service Tables
      scenarios: {
        TableName: `${config.APP_NAME}-scenarios-${this.env}`,
        KeySchema: [
          { AttributeName: 'scenarioId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'scenarioId', AttributeType: 'S' },
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'userId-createdAt-index',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'createdAt', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      },

      scenarioAnalytics: {
        TableName: `${config.APP_NAME}-scenario-analytics-${this.env}`,
        KeySchema: [
          { AttributeName: 'scenarioId', KeyType: 'HASH' },
          { AttributeName: 'date', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'scenarioId', AttributeType: 'S' },
          { AttributeName: 'date', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },

      // Sharing Service Tables
      sharedScenarios: {
        TableName: `${config.APP_NAME}-shared-scenarios-${this.env}`,
        KeySchema: [
          { AttributeName: 'shareUrl', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'shareUrl', AttributeType: 'S' },
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'userId-createdAt-index',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'createdAt', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      },

      reports: {
        TableName: `${config.APP_NAME}-reports-${this.env}`,
        KeySchema: [
          { AttributeName: 'reportId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'reportId', AttributeType: 'S' },
          { AttributeName: 'status', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'status-createdAt-index',
            KeySchema: [
              { AttributeName: 'status', KeyType: 'HASH' },
              { AttributeName: 'createdAt', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },

      // Social Service Tables
      achievements: {
        TableName: `${config.APP_NAME}-achievements-${this.env}`,
        KeySchema: [
          { AttributeName: 'achievementId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'achievementId', AttributeType: 'S' },
          { AttributeName: 'category', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'category-index',
            KeySchema: [
              { AttributeName: 'category', KeyType: 'HASH' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },

      userAchievements: {
        TableName: `${config.APP_NAME}-user-achievements-${this.env}`,
        KeySchema: [
          { AttributeName: 'userAchievementId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userAchievementId', AttributeType: 'S' },
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'achievementId', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'userId-achievementId-index',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'achievementId', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      },

      posts: {
        TableName: `${config.APP_NAME}-posts-${this.env}`,
        KeySchema: [
          { AttributeName: 'postId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'postId', AttributeType: 'S' },
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'userId-createdAt-index',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'createdAt', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 10,
              WriteCapacityUnits: 10
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      },

      comments: {
        TableName: `${config.APP_NAME}-comments-${this.env}`,
        KeySchema: [
          { AttributeName: 'commentId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'commentId', AttributeType: 'S' },
          { AttributeName: 'postId', AttributeType: 'S' },
          { AttributeName: 'createdAt', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'postId-createdAt-index',
            KeySchema: [
              { AttributeName: 'postId', KeyType: 'HASH' },
              { AttributeName: 'createdAt', KeyType: 'RANGE' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      },

      userProfiles: {
        TableName: `${config.APP_NAME}-user-profiles-${this.env}`,
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'username', AttributeType: 'S' }
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'username-index',
            KeySchema: [
              { AttributeName: 'username', KeyType: 'HASH' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 10
        }
      }
    };
  }

  /**
   * Get Redis configuration
   * All environments use Redis (local for dev, ElastiCache for test/prod)
   */
  getRedisConfig() {
    const isAWS = this.env === 'test' || this.env === 'production';
    
    if (isAWS) {
      // AWS ElastiCache Configuration
      return {
        host: config.ELASTICACHE_REDIS_HOST,
        port: config.ELASTICACHE_REDIS_PORT || 6379,
        password: config.ELASTICACHE_REDIS_PASSWORD,
        tls: {
          servername: config.ELASTICACHE_REDIS_HOST
        },
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      };
    } else {
      // Local Redis Configuration
      return {
        host: config.REDIS_HOST || 'localhost',
        port: config.REDIS_PORT || 6379,
        password: config.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      };
    }
  }

  /**
   * Get environment-specific database URLs
   */
  getDatabaseUrls() {
    const postgresConfig = this.getPostgreSQLConfig();
    const redisConfig = this.getRedisConfig();
    
    return {
      postgres: `postgresql://${postgresConfig.username}:${postgresConfig.password}@${postgresConfig.host}:${postgresConfig.port}/${postgresConfig.database}`,
      redis: `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}`
    };
  }

  /**
   * Check if running in AWS environment
   */
  isAWSEnvironment() {
    return this.env === 'test' || this.env === 'production';
  }

  /**
   * Check if running in development environment
   */
  isDevelopment() {
    return this.env === 'development';
  }
}

// Create singleton instance
const dbConfig = new DatabaseConfig();

module.exports = {
  dbConfig,
  getPostgreSQLConfig: () => dbConfig.getPostgreSQLConfig(),
  getDynamoDBConfig: () => dbConfig.getDynamoDBConfig(),
  getDynamoDBTables: () => dbConfig.getDynamoDBTables(),
  getRedisConfig: () => dbConfig.getRedisConfig(),
  getDatabaseUrls: () => dbConfig.getDatabaseUrls(),
  isAWSEnvironment: () => dbConfig.isAWSEnvironment(),
  isDevelopment: () => dbConfig.isDevelopment()
};