#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates from local MongoDB to AWS DynamoDB and PostgreSQL to AWS RDS
 * 
 * Usage:
 *   node scripts/migrate-to-aws.js [environment] [options]
 * 
 * Examples:
 *   node scripts/migrate-to-aws.js test --dry-run
 *   node scripts/migrate-to-aws.js production --backup
 */

const { program } = require('commander');
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import our configurations
const { config } = require('../shared/config/env');
const { dynamoDBClient, getTableName } = require('../shared/config/dynamodb');
const { getPostgreSQLConfig } = require('../shared/config/database');

class DatabaseMigration {
  constructor(environment, options = {}) {
    this.environment = environment;
    this.options = options;
    this.dryRun = options.dryRun || false;
    this.backup = options.backup || false;
    this.batchSize = options.batchSize || 100;
    
    // Set environment
    process.env.NODE_ENV = environment;
    
    this.migrationLog = {
      startTime: new Date(),
      environment,
      options,
      results: {
        postgresql: { migrated: 0, errors: [] },
        dynamodb: { migrated: 0, errors: [] }
      }
    };
  }

  /**
   * Initialize connections to source and destination databases
   */
  async initializeConnections() {
    console.log('🔧 Initializing database connections...');

    // Source MongoDB connections (local)
    this.mongoConnections = {
      history: await this.connectMongoDB('what_if_history'),
      sharing: await this.connectMongoDB('what_if_sharing'),
      social: await this.connectMongoDB('what_if_social')
    };

    // Destination DynamoDB
    this.dynamoDB = dynamoDBClient;

    // Destination PostgreSQL (AWS RDS)
    this.postgresConfig = getPostgreSQLConfig();
    this.postgres = new Sequelize(this.postgresConfig);

    await this.postgres.authenticate();
    console.log('✅ All database connections established');
  }

  /**
   * Connect to MongoDB database
   */
  async connectMongoDB(databaseName) {
    const mongoUri = `mongodb://admin:admin123@localhost:27017/${databaseName}?authSource=admin`;
    
    const connection = await mongoose.createConnection(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`✅ Connected to MongoDB: ${databaseName}`);
    return connection;
  }

  /**
   * Create backup of source databases
   */
  async createBackup() {
    if (!this.backup) return;

    console.log('📦 Creating database backups...');
    const backupDir = `./backups/migration-${this.environment}-${Date.now()}`;
    await fs.mkdir(backupDir, { recursive: true });

    // Backup MongoDB collections
    for (const [service, connection] of Object.entries(this.mongoConnections)) {
      const collections = await connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        const data = await connection.db.collection(collection.name).find({}).toArray();
        const backupFile = path.join(backupDir, `${service}-${collection.name}.json`);
        await fs.writeFile(backupFile, JSON.stringify(data, null, 2));
        console.log(`✅ Backed up ${service}.${collection.name} (${data.length} documents)`);
      }
    }

    // Backup PostgreSQL (if needed)
    console.log(`✅ Backups created in: ${backupDir}`);
  }

  /**
   * Migrate PostgreSQL data (users, sessions, etc.)
   */
  async migratePostgreSQL() {
    console.log('🔄 Migrating PostgreSQL data...');

    try {
      // Get source data from local PostgreSQL
      const sourceConfig = {
        host: 'localhost',
        port: 5432,
        database: 'what_if_users',
        username: 'postgres',
        password: 'postgres123',
        dialect: 'postgres'
      };

      const sourcePostgres = new Sequelize(sourceConfig);
      await sourcePostgres.authenticate();

      // Get all tables and their data
      const tables = ['users', 'user_roles', 'user_sessions', 'user_statistics'];
      
      for (const tableName of tables) {
        console.log(`📊 Migrating table: ${tableName}`);
        
        const sourceData = await sourcePostgres.query(
          `SELECT * FROM ${tableName}`,
          { type: Sequelize.QueryTypes.SELECT }
        );

        if (this.dryRun) {
          console.log(`[DRY RUN] Would migrate ${sourceData.length} records from ${tableName}`);
          continue;
        }

        // Insert data into destination (AWS RDS)
        for (const record of sourceData) {
          try {
            await this.postgres.query(
              `INSERT INTO ${tableName} VALUES (${Object.keys(record).map(() => '?').join(', ')})`,
              {
                replacements: Object.values(record),
                type: Sequelize.QueryTypes.INSERT
              }
            );
            this.migrationLog.results.postgresql.migrated++;
          } catch (error) {
            this.migrationLog.results.postgresql.errors.push({
              table: tableName,
              record: record.id || record.email || 'unknown',
              error: error.message
            });
          }
        }

        console.log(`✅ Migrated ${sourceData.length} records from ${tableName}`);
      }

      await sourcePostgres.close();
    } catch (error) {
      console.error('❌ PostgreSQL migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate MongoDB collections to DynamoDB
   */
  async migrateDynamoDB() {
    console.log('🔄 Migrating MongoDB to DynamoDB...');

    // Define collection mappings
    const collectionMappings = {
      history: {
        scenarios: 'scenarios',
        scenario_analytics: 'scenarioAnalytics'
      },
      sharing: {
        shared_scenarios: 'sharedScenarios',
        reports: 'reports'
      },
      social: {
        achievements: 'achievements',
        userachievements: 'userAchievements',
        posts: 'posts',
        comments: 'comments',
        userprofiles: 'userProfiles'
      }
    };

    for (const [service, mappings] of Object.entries(collectionMappings)) {
      const connection = this.mongoConnections[service];
      
      for (const [mongoCollection, dynamoTable] of Object.entries(mappings)) {
        console.log(`📊 Migrating ${service}.${mongoCollection} to DynamoDB ${dynamoTable}...`);
        
        try {
          const collection = connection.db.collection(mongoCollection);
          const documents = await collection.find({}).toArray();

          if (this.dryRun) {
            console.log(`[DRY RUN] Would migrate ${documents.length} documents from ${mongoCollection}`);
            continue;
          }

          // Process documents in batches
          for (let i = 0; i < documents.length; i += this.batchSize) {
            const batch = documents.slice(i, i + this.batchSize);
            const processedBatch = batch.map(doc => this.transformDocument(doc, mongoCollection));
            
            try {
              await this.dynamoDB.batchWrite(dynamoTable, processedBatch);
              this.migrationLog.results.dynamodb.migrated += batch.length;
              console.log(`✅ Migrated batch ${Math.floor(i / this.batchSize) + 1} (${batch.length} items)`);
            } catch (error) {
              console.error(`❌ Batch migration failed:`, error);
              this.migrationLog.results.dynamodb.errors.push({
                collection: mongoCollection,
                batch: Math.floor(i / this.batchSize) + 1,
                error: error.message
              });
            }
          }

        } catch (error) {
          console.error(`❌ Failed to migrate ${mongoCollection}:`, error);
          this.migrationLog.results.dynamodb.errors.push({
            collection: mongoCollection,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Transform MongoDB document to DynamoDB format
   */
  transformDocument(doc, collectionName) {
    // Remove MongoDB-specific fields
    const transformed = { ...doc };
    delete transformed._id;
    delete transformed.__v;

    // Add required fields for DynamoDB
    switch (collectionName) {
      case 'scenarios':
        transformed.scenarioId = transformed.scenarioId || uuidv4();
        break;
      case 'shared_scenarios':
        transformed.shareUrl = transformed.shareUrl || uuidv4();
        break;
      case 'reports':
        transformed.reportId = transformed.reportId || uuidv4();
        break;
      case 'achievements':
        transformed.achievementId = transformed.achievementId || uuidv4();
        break;
      case 'userachievements':
        transformed.userAchievementId = transformed.userAchievementId || uuidv4();
        break;
      case 'posts':
        transformed.postId = transformed.postId || uuidv4();
        break;
      case 'comments':
        transformed.commentId = transformed.commentId || uuidv4();
        break;
      case 'userprofiles':
        // userProfiles uses userId as primary key
        break;
    }

    // Convert dates to ISO strings
    Object.keys(transformed).forEach(key => {
      if (transformed[key] instanceof Date) {
        transformed[key] = transformed[key].toISOString();
      }
    });

    return transformed;
  }

  /**
   * Verify migration results
   */
  async verifyMigration() {
    console.log('🔍 Verifying migration results...');

    // Verify PostgreSQL data
    const postgresTables = ['users', 'user_roles', 'user_sessions'];
    for (const table of postgresTables) {
      const count = await this.postgres.query(
        `SELECT COUNT(*) as count FROM ${table}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`📊 ${table}: ${count[0].count} records`);
    }

    // Verify DynamoDB data
    const dynamoTables = ['scenarios', 'sharedScenarios', 'achievements'];
    for (const table of dynamoTables) {
      try {
        const tableName = getTableName(table);
        const items = await this.dynamoDB.scan(table);
        console.log(`📊 ${table}: ${items.length} items`);
      } catch (error) {
        console.log(`⚠️ Could not verify ${table}: ${error.message}`);
      }
    }
  }

  /**
   * Clean up connections
   */
  async cleanup() {
    console.log('🧹 Cleaning up connections...');

    // Close MongoDB connections
    for (const connection of Object.values(this.mongoConnections)) {
      await connection.close();
    }

    // Close PostgreSQL connection
    await this.postgres.close();

    console.log('✅ All connections closed');
  }

  /**
   * Generate migration report
   */
  generateReport() {
    this.migrationLog.endTime = new Date();
    this.migrationLog.duration = this.migrationLog.endTime - this.migrationLog.startTime;

    const report = {
      summary: {
        environment: this.environment,
        duration: `${Math.round(this.migrationLog.duration / 1000)}s`,
        dryRun: this.dryRun,
        totalMigrated: this.migrationLog.results.postgresql.migrated + this.migrationLog.results.dynamodb.migrated,
        totalErrors: this.migrationLog.results.postgresql.errors.length + this.migrationLog.results.dynamodb.errors.length
      },
      details: this.migrationLog
    };

    const reportFile = `./migration-report-${this.environment}-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('📋 Migration Report:');
    console.log(`   Environment: ${report.summary.environment}`);
    console.log(`   Duration: ${report.summary.duration}`);
    console.log(`   Total Migrated: ${report.summary.totalMigrated}`);
    console.log(`   Total Errors: ${report.summary.totalErrors}`);
    console.log(`   Report saved to: ${reportFile}`);

    return report;
  }

  /**
   * Run the complete migration
   */
  async run() {
    try {
      console.log(`🚀 Starting database migration to ${this.environment.toUpperCase()} environment`);
      console.log(`   Dry Run: ${this.dryRun ? 'YES' : 'NO'}`);
      console.log(`   Backup: ${this.backup ? 'YES' : 'NO'}`);
      console.log(`   Batch Size: ${this.batchSize}`);

      await this.initializeConnections();
      await this.createBackup();
      await this.migratePostgreSQL();
      await this.migrateDynamoDB();
      await this.verifyMigration();

      const report = this.generateReport();

      if (report.summary.totalErrors > 0) {
        console.log('⚠️ Migration completed with errors. Check the report for details.');
        process.exit(1);
      } else {
        console.log('✅ Migration completed successfully!');
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.generateReport();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// CLI setup
program
  .name('migrate-to-aws')
  .description('Migrate database from local to AWS managed services')
  .version('1.0.0')
  .argument('<environment>', 'Target environment (test|production)')
  .option('--dry-run', 'Perform a dry run without making changes')
  .option('--backup', 'Create backup of source databases')
  .option('--batch-size <size>', 'Batch size for DynamoDB writes', '100')
  .action(async (environment, options) => {
    if (!['test', 'production'].includes(environment)) {
      console.error('❌ Environment must be "test" or "production"');
      process.exit(1);
    }

    const migration = new DatabaseMigration(environment, options);
    await migration.run();
  });

program.parse();