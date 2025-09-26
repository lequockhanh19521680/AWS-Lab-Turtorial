#!/usr/bin/env node

/**
 * DynamoDB Table Setup Script
 * Creates all required DynamoDB tables for the application
 * 
 * Usage:
 *   node scripts/setup-dynamodb-tables.js [environment] [options]
 * 
 * Examples:
 *   node scripts/setup-dynamodb-tables.js development
 *   node scripts/setup-dynamodb-tables.js test --region us-east-1
 *   node scripts/setup-dynamodb-tables.js production --force
 */

const { program } = require('commander');
const AWS = require('aws-sdk');
const { config } = require('../shared/config/env');
const { getDynamoDBTables } = require('../shared/config/database');

class DynamoDBSetup {
  constructor(environment, options = {}) {
    this.environment = environment;
    this.options = options;
    this.force = options.force || false;
    this.region = options.region || config.AWS_REGION || 'us-east-1';
    
    // Set environment
    process.env.NODE_ENV = environment;
    
    this.setupLog = {
      startTime: new Date(),
      environment,
      region: this.region,
      tables: {},
      errors: []
    };
  }

  /**
   * Initialize DynamoDB client
   */
  initializeDynamoDB() {
    const isLocal = this.environment === 'development';
    
    if (isLocal) {
      this.dynamodb = new AWS.DynamoDB({
        region: 'us-east-1',
        endpoint: 'http://localhost:8000',
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      });
      console.log('🔧 Using local DynamoDB');
    } else {
      AWS.config.update({ region: this.region });
      this.dynamodb = new AWS.DynamoDB();
      console.log(`🔧 Using AWS DynamoDB in region: ${this.region}`);
    }
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName) {
    try {
      await this.dynamodb.describeTable({ TableName: tableName }).promise();
      return true;
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a single table
   */
  async createTable(tableName, tableConfig) {
    try {
      const exists = await this.tableExists(tableConfig.TableName);
      
      if (exists) {
        if (this.force) {
          console.log(`🔄 Deleting existing table: ${tableConfig.TableName}`);
          await this.dynamodb.deleteTable({ TableName: tableConfig.TableName }).promise();
          
          // Wait for table to be deleted
          await this.dynamodb.waitFor('tableNotExists', { 
            TableName: tableConfig.TableName 
          }).promise();
          
          console.log(`✅ Table deleted: ${tableConfig.TableName}`);
        } else {
          console.log(`⚠️ Table already exists: ${tableConfig.TableName}`);
          this.setupLog.tables[tableName] = { status: 'exists', skipped: true };
          return;
        }
      }

      console.log(`🔧 Creating table: ${tableConfig.TableName}`);
      
      // Create table
      await this.dynamodb.createTable(tableConfig).promise();
      console.log(`⏳ Waiting for table to be active: ${tableConfig.TableName}`);
      
      // Wait for table to be active
      await this.dynamodb.waitFor('tableExists', { 
        TableName: tableConfig.TableName 
      }).promise();
      
      console.log(`✅ Table created and active: ${tableConfig.TableName}`);
      
      this.setupLog.tables[tableName] = { 
        status: 'created', 
        tableName: tableConfig.TableName,
        success: true 
      };

    } catch (error) {
      console.error(`❌ Failed to create table ${tableConfig.TableName}:`, error.message);
      this.setupLog.tables[tableName] = { 
        status: 'failed', 
        tableName: tableConfig.TableName,
        error: error.message 
      };
      this.setupLog.errors.push({
        table: tableName,
        tableName: tableConfig.TableName,
        error: error.message
      });
    }
  }

  /**
   * Create all tables
   */
  async createAllTables() {
    console.log('🚀 Creating DynamoDB tables...');
    
    const tables = getDynamoDBTables();
    
    for (const [tableName, tableConfig] of Object.entries(tables)) {
      await this.createTable(tableName, tableConfig);
    }
  }

  /**
   * Insert sample data for development
   */
  async insertSampleData() {
    if (this.environment !== 'development') {
      return;
    }

    console.log('📝 Inserting sample data for development...');
    
    const docClient = new AWS.DynamoDB.DocumentClient({
      region: this.region,
      endpoint: this.environment === 'development' ? 'http://localhost:8000' : undefined
    });

    // Sample achievements
    const achievements = [
      {
        achievementId: 'first_scenario',
        name: 'First Steps',
        description: 'Tạo viễn cảnh đầu tiên của bạn',
        category: 'creation',
        icon: '🌟',
        badge: 'first-steps',
        points: 10,
        rarity: 'common',
        requirements: {
          type: 'scenario_created',
          count: 1
        },
        isActive: true,
        isHidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        achievementId: 'scenario_master',
        name: 'Master Creator',
        description: 'Tạo 100 viễn cảnh',
        category: 'creation',
        icon: '🎭',
        badge: 'master-creator',
        points: 100,
        rarity: 'rare',
        requirements: {
          type: 'scenario_created',
          count: 100
        },
        isActive: true,
        isHidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    try {
      const achievementsTable = getDynamoDBTables().achievements.TableName;
      
      for (const achievement of achievements) {
        await docClient.put({
          TableName: achievementsTable,
          Item: achievement
        }).promise();
      }
      
      console.log(`✅ Inserted ${achievements.length} sample achievements`);
    } catch (error) {
      console.error('❌ Failed to insert sample data:', error.message);
    }
  }

  /**
   * List all tables
   */
  async listTables() {
    try {
      const result = await this.dynamodb.listTables().promise();
      console.log('\n📊 Available tables:');
      
      for (const tableName of result.TableNames) {
        const description = await this.dynamodb.describeTable({ TableName: tableName }).promise();
        const table = description.Table;
        console.log(`   ${tableName}`);
        console.log(`     Status: ${table.TableStatus}`);
        console.log(`     Item Count: ${table.ItemCount || 0}`);
        console.log(`     Size: ${(table.TableSizeBytes / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
      }
    } catch (error) {
      console.error('❌ Failed to list tables:', error.message);
    }
  }

  /**
   * Verify table setup
   */
  async verifySetup() {
    console.log('🔍 Verifying table setup...');
    
    const tables = getDynamoDBTables();
    let allGood = true;
    
    for (const [tableName, tableConfig] of Object.entries(tables)) {
      const exists = await this.tableExists(tableConfig.TableName);
      
      if (exists) {
        console.log(`✅ ${tableConfig.TableName} - OK`);
      } else {
        console.log(`❌ ${tableConfig.TableName} - MISSING`);
        allGood = false;
      }
    }
    
    return allGood;
  }

  /**
   * Generate setup report
   */
  generateReport() {
    this.setupLog.endTime = new Date();
    this.setupLog.duration = this.setupLog.endTime - this.setupLog.startTime;

    const report = {
      summary: {
        environment: this.environment,
        region: this.region,
        duration: `${Math.round(this.setupLog.duration / 1000)}s`,
        tablesCreated: Object.values(this.setupLog.tables).filter(t => t.success).length,
        tablesSkipped: Object.values(this.setupLog.tables).filter(t => t.skipped).length,
        tablesFailed: Object.values(this.setupLog.tables).filter(t => t.status === 'failed').length,
        totalErrors: this.setupLog.errors.length
      },
      details: this.setupLog
    };

    const reportFile = `./dynamodb-setup-report-${this.environment}-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📋 Setup Report:');
    console.log(`   Environment: ${report.summary.environment}`);
    console.log(`   Region: ${report.summary.region}`);
    console.log(`   Duration: ${report.summary.duration}`);
    console.log(`   Tables Created: ${report.summary.tablesCreated}`);
    console.log(`   Tables Skipped: ${report.summary.tablesSkipped}`);
    console.log(`   Tables Failed: ${report.summary.tablesFailed}`);
    console.log(`   Total Errors: ${report.summary.totalErrors}`);
    console.log(`   Report saved to: ${reportFile}`);

    return report;
  }

  /**
   * Run the complete setup
   */
  async run() {
    try {
      console.log(`🚀 Setting up DynamoDB tables for ${this.environment.toUpperCase()} environment`);
      console.log(`   Region: ${this.region}`);
      console.log(`   Force Recreate: ${this.force ? 'YES' : 'NO'}`);

      this.initializeDynamoDB();
      await this.createAllTables();
      await this.insertSampleData();
      await this.verifySetup();
      await this.listTables();

      const report = this.generateReport();

      if (report.summary.totalErrors > 0) {
        console.log('⚠️ Setup completed with errors. Check the report for details.');
        process.exit(1);
      } else {
        console.log('✅ DynamoDB setup completed successfully!');
      }

    } catch (error) {
      console.error('❌ Setup failed:', error);
      this.generateReport();
      process.exit(1);
    }
  }
}

// CLI setup
program
  .name('setup-dynamodb-tables')
  .description('Setup DynamoDB tables for the application')
  .version('1.0.0')
  .argument('<environment>', 'Target environment (development|test|production)')
  .option('--region <region>', 'AWS region', 'us-east-1')
  .option('--force', 'Force recreate existing tables')
  .action(async (environment, options) => {
    if (!['development', 'test', 'production'].includes(environment)) {
      console.error('❌ Environment must be "development", "test", or "production"');
      process.exit(1);
    }

    const setup = new DynamoDBSetup(environment, options);
    await setup.run();
  });

program.parse();