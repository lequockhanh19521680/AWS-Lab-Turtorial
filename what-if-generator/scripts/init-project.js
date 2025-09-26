#!/usr/bin/env node

/**
 * Project Initialization Script
 * Sets up the project for first-time use without database migrations
 * 
 * Usage:
 *   node scripts/init-project.js [environment] [options]
 * 
 * Examples:
 *   node scripts/init-project.js development
 *   node scripts/init-project.js test --region us-east-1
 *   node scripts/init-project.js production --verify-only
 */

const { program } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');
const { config } = require('../shared/config/env');
const { dynamoDBClient } = require('../shared/config/dynamodb');
const { getDynamoDBTables } = require('../shared/config/database');

class ProjectInitializer {
  constructor(environment, options = {}) {
    this.environment = environment;
    this.options = options;
    this.verifyOnly = options.verifyOnly || false;
    this.region = options.region || config.AWS_REGION || 'us-east-1';
    
    // Set environment
    process.env.NODE_ENV = environment;
    
    this.initLog = {
      startTime: new Date(),
      environment,
      region: this.region,
      steps: [],
      errors: []
    };
  }

  /**
   * Main initialization process
   */
  async initialize() {
    try {
      console.log(`🚀 Initializing What If Generator for ${this.environment} environment`);
      
      await this.createDirectories();
      await this.setupDynamoDBTables();
      await this.verifyServices();
      await this.generateInitialData();
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      this.initLog.errors.push(error.message);
      process.exit(1);
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    console.log('📁 Creating directories...');
    
    const directories = [
      'logs',
      'uploads',
      'outputs',
      'temp',
      'credentials'
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
        console.log(`  ✅ Directory ${dir} already exists`);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`  ✅ Created directory: ${dir}`);
      }
    }

    this.initLog.steps.push('directories_created');
  }

  /**
   * Setup DynamoDB tables
   */
  async setupDynamoDBTables() {
    if (this.verifyOnly) {
      console.log('🔍 Verifying DynamoDB tables...');
      return await this.verifyDynamoDBTables();
    }

    console.log('🗄️ Setting up DynamoDB tables...');
    
    try {
      await dynamoDBClient.createTables();
      console.log('  ✅ DynamoDB tables created successfully');
      this.initLog.steps.push('dynamodb_tables_created');
    } catch (error) {
      console.error('  ❌ Failed to create DynamoDB tables:', error.message);
      this.initLog.errors.push(`DynamoDB setup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify DynamoDB tables exist
   */
  async verifyDynamoDBTables() {
    const tables = getDynamoDBTables();
    const isLocal = this.environment === 'development';
    
    let dynamodb;
    if (isLocal) {
      dynamodb = new AWS.DynamoDB({
        region: 'us-east-1',
        endpoint: 'http://localhost:8000',
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      });
    } else {
      dynamodb = new AWS.DynamoDB({
        region: this.region
      });
    }

    for (const [tableName, tableConfig] of Object.entries(tables)) {
      try {
        const result = await dynamodb.describeTable({ 
          TableName: tableConfig.TableName 
        }).promise();
        
        console.log(`  ✅ Table ${tableConfig.TableName} exists (${result.Table.TableStatus})`);
      } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
          console.log(`  ⚠️  Table ${tableConfig.TableName} does not exist`);
          this.initLog.errors.push(`Missing table: ${tableConfig.TableName}`);
        } else {
          console.error(`  ❌ Error checking table ${tableConfig.TableName}:`, error.message);
          this.initLog.errors.push(`Table check failed: ${tableConfig.TableName}`);
        }
      }
    }
  }

  /**
   * Verify service configurations
   */
  async verifyServices() {
    console.log('🔧 Verifying service configurations...');
    
    const serviceChecks = [
      {
        name: 'PostgreSQL',
        check: () => this.verifyPostgreSQL()
      },
      {
        name: 'Redis',
        check: () => this.verifyRedis()
      },
      {
        name: 'DynamoDB',
        check: () => this.verifyDynamoDB()
      }
    ];

    for (const service of serviceChecks) {
      try {
        await service.check();
        console.log(`  ✅ ${service.name} configuration verified`);
      } catch (error) {
        console.log(`  ⚠️  ${service.name} configuration issue: ${error.message}`);
        this.initLog.errors.push(`${service.name}: ${error.message}`);
      }
    }

    this.initLog.steps.push('services_verified');
  }

  /**
   * Verify PostgreSQL connection
   */
  async verifyPostgreSQL() {
    const { getPostgreSQLConfig } = require('../shared/config/database');
    const { Sequelize } = require('sequelize');
    
    const pgConfig = getPostgreSQLConfig();
    const sequelize = new Sequelize(pgConfig);
    
    try {
      await sequelize.authenticate();
      await sequelize.close();
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * Verify Redis connection
   */
  async verifyRedis() {
    const { redisClient } = require('../shared/config/redis');
    
    try {
      const healthCheck = await redisClient.healthCheck();
      if (healthCheck.status !== 'healthy') {
        throw new Error(`Redis health check failed: ${healthCheck.error}`);
      }
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  /**
   * Verify DynamoDB connection
   */
  async verifyDynamoDB() {
    try {
      const healthCheck = await dynamoDBClient.healthCheck();
      if (healthCheck.status !== 'healthy') {
        throw new Error(`DynamoDB health check failed: ${healthCheck.error}`);
      }
    } catch (error) {
      throw new Error(`DynamoDB connection failed: ${error.message}`);
    }
  }

  /**
   * Generate initial data (non-migration approach)
   */
  async generateInitialData() {
    console.log('🌱 Generating initial data...');
    
    try {
      await this.createInitialAchievements();
      console.log('  ✅ Initial achievements created');
      this.initLog.steps.push('initial_data_created');
    } catch (error) {
      console.log(`  ⚠️  Failed to create initial data: ${error.message}`);
      this.initLog.errors.push(`Initial data creation failed: ${error.message}`);
    }
  }

  /**
   * Create initial achievement data
   */
  async createInitialAchievements() {
    const achievements = [
      {
        achievementId: 'first_scenario',
        name: 'First Scenario',
        description: 'Create your first what-if scenario',
        category: 'beginner',
        points: 10,
        icon: '🎯',
        requirement: { type: 'scenario_count', value: 1 }
      },
      {
        achievementId: 'creative_mind',
        name: 'Creative Mind',
        description: 'Create 10 unique scenarios',
        category: 'creativity', 
        points: 50,
        icon: '🧠',
        requirement: { type: 'scenario_count', value: 10 }
      },
      {
        achievementId: 'social_sharer',
        name: 'Social Sharer',
        description: 'Share your first scenario',
        category: 'social',
        points: 20,
        icon: '🤝',
        requirement: { type: 'share_count', value: 1 }
      }
    ];

    for (const achievement of achievements) {
      try {
        await dynamoDBClient.putItem('achievements', achievement);
      } catch (error) {
        // Ignore if already exists
        if (!error.message.includes('ConditionalCheckFailedException')) {
          throw error;
        }
      }
    }
  }

  /**
   * Print initialization summary
   */
  printSummary() {
    console.log('\n📋 Initialization Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Environment: ${this.environment}`);
    console.log(`Region: ${this.region}`);
    console.log(`Started: ${this.initLog.startTime.toISOString()}`);
    console.log(`Completed: ${new Date().toISOString()}`);
    
    console.log('\n✅ Completed Steps:');
    this.initLog.steps.forEach(step => {
      console.log(`  • ${step.replace(/_/g, ' ')}`);
    });

    if (this.initLog.errors.length > 0) {
      console.log('\n⚠️  Warnings/Errors:');
      this.initLog.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }

    console.log('\n🎉 Project initialization completed!');
    
    if (this.environment === 'development') {
      console.log('\n🚀 Next Steps:');
      console.log('  1. Update your API keys in .env.local');
      console.log('  2. Start services: docker-compose up -d');
      console.log('  3. Access the application: http://localhost:3007');
    }
  }
}

// CLI Setup
program
  .name('init-project')
  .description('Initialize What If Generator project')
  .argument('[environment]', 'Environment to initialize', 'development')
  .option('-r, --region <region>', 'AWS region', 'us-east-1')
  .option('-v, --verify-only', 'Only verify, do not create')
  .action(async (environment, options) => {
    const initializer = new ProjectInitializer(environment, options);
    await initializer.initialize();
  });

// Handle errors
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  program.parse();
}

module.exports = ProjectInitializer;