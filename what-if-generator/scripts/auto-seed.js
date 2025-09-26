#!/usr/bin/env node

/**
 * Auto Seed Script for What If Generator
 * Automatically seeds the database with master data when the application starts
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const seedData = require('./seed-data');

// Configure logging
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

class AutoSeeder {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.isAutoSeedEnabled = process.env.AUTO_SEED === 'true';
    
    if (!this.isAutoSeedEnabled) {
      log('info', 'Auto seed is disabled. Set AUTO_SEED=true to enable.');
      return;
    }

    log('info', `Starting auto seed for environment: ${this.environment}`);
    
    // Initialize database connections
    this.initializeConnections();
  }

  initializeConnections() {
    // PostgreSQL connection
    this.pgPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // DynamoDB connection
    const dynamoConfig = {
      region: process.env.DYNAMODB_REGION || 'us-east-1',
    };

    if (process.env.DYNAMODB_ENDPOINT) {
      dynamoConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
    }

    this.dynamoClient = new DynamoDBClient(dynamoConfig);
    this.dynamoDocClient = DynamoDBDocumentClient.from(this.dynamoClient);
    this.dynamoPrefix = process.env.AWS_DYNAMODB_PREFIX || 'what-if-generator-dev';
  }

  async run() {
    if (!this.isAutoSeedEnabled) {
      return;
    }

    try {
      log('info', 'Starting auto seed process...');

      // Wait for databases to be ready
      await this.waitForDatabases();

      // Seed PostgreSQL data
      await this.seedPostgreSQLData();

      // Seed DynamoDB data
      await this.seedDynamoDBData();

      log('info', 'Auto seed process completed successfully!');
    } catch (error) {
      log('error', 'Auto seed process failed:', error);
      process.exit(1);
    }
  }

  async waitForDatabases() {
    log('info', 'Waiting for databases to be ready...');
    
    // Wait for PostgreSQL
    let pgReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        await this.pgPool.query('SELECT 1');
        pgReady = true;
        log('info', 'PostgreSQL is ready');
        break;
      } catch (error) {
        log('warn', `PostgreSQL not ready, attempt ${i + 1}/30`);
        await this.sleep(2000);
      }
    }

    if (!pgReady) {
      throw new Error('PostgreSQL is not ready after 30 attempts');
    }

    // Wait for DynamoDB (check if we can list tables)
    let dynamoReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');
        await this.dynamoClient.send(new ListTablesCommand({}));
        dynamoReady = true;
        log('info', 'DynamoDB is ready');
        break;
      } catch (error) {
        log('warn', `DynamoDB not ready, attempt ${i + 1}/10`);
        await this.sleep(2000);
      }
    }

    if (!dynamoReady) {
      throw new Error('DynamoDB is not ready after 10 attempts');
    }
  }

  async seedPostgreSQLData() {
    log('info', 'Seeding PostgreSQL data...');

    // Seed admin users
    await this.seedAdminUsers();

    // Seed system settings
    await this.seedSystemSettings();

    log('info', 'PostgreSQL seeding completed');
  }

  async seedAdminUsers() {
    log('info', 'Seeding admin users...');

    for (const userData of seedData.adminUsers) {
      try {
        // Check if user already exists
        const existingUser = await this.pgPool.query(
          'SELECT id FROM users WHERE email = $1',
          [userData.email]
        );

        if (existingUser.rows.length > 0) {
          log('info', `Admin user ${userData.email} already exists, skipping`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Insert user
        const userResult = await this.pgPool.query(`
          INSERT INTO users (email, password, first_name, last_name, is_active, email_verified)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          userData.email,
          hashedPassword,
          userData.first_name,
          userData.last_name,
          userData.is_active,
          userData.email_verified
        ]);

        const userId = userResult.rows[0].id;

        // Insert roles
        for (const role of userData.roles) {
          await this.pgPool.query(`
            INSERT INTO user_roles (user_id, role)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role) WHERE is_active = true DO NOTHING
          `, [userId, role]);
        }

        log('info', `Created admin user: ${userData.email}`);
      } catch (error) {
        log('error', `Failed to create admin user ${userData.email}:`, error);
      }
    }
  }

  async seedSystemSettings() {
    log('info', 'Seeding system settings...');

    // Create settings table if it doesn't exist
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const setting of seedData.systemSettings) {
      try {
        await this.pgPool.query(`
          INSERT INTO system_settings (key, value, description, category)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            updated_at = CURRENT_TIMESTAMP
        `, [setting.key, setting.value, setting.description, setting.category]);

        log('info', `Seeded setting: ${setting.key}`);
      } catch (error) {
        log('error', `Failed to seed setting ${setting.key}:`, error);
      }
    }
  }

  async seedDynamoDBData() {
    log('info', 'Seeding DynamoDB data...');

    // Seed categories
    await this.seedCategories();

    // Seed achievements
    await this.seedAchievements();

    // Seed scenario templates
    await this.seedScenarioTemplates();

    // Seed notification templates
    await this.seedNotificationTemplates();

    log('info', 'DynamoDB seeding completed');
  }

  async seedCategories() {
    log('info', 'Seeding categories...');

    const tableName = `${this.dynamoPrefix}-categories`;

    for (const category of seedData.categories) {
      try {
        await this.dynamoDocClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            ...category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          ConditionExpression: 'attribute_not_exists(id)'
        }));

        log('info', `Seeded category: ${category.name}`);
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          log('info', `Category ${category.name} already exists, skipping`);
        } else {
          log('error', `Failed to seed category ${category.name}:`, error);
        }
      }
    }
  }

  async seedAchievements() {
    log('info', 'Seeding achievements...');

    const tableName = `${this.dynamoPrefix}-achievements`;

    for (const achievement of seedData.achievements) {
      try {
        await this.dynamoDocClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            achievementId: achievement.id,
            ...achievement,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          ConditionExpression: 'attribute_not_exists(achievementId)'
        }));

        log('info', `Seeded achievement: ${achievement.name}`);
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          log('info', `Achievement ${achievement.name} already exists, skipping`);
        } else {
          log('error', `Failed to seed achievement ${achievement.name}:`, error);
        }
      }
    }
  }

  async seedScenarioTemplates() {
    log('info', 'Seeding scenario templates...');

    const tableName = `${this.dynamoPrefix}-scenario-templates`;

    for (const template of seedData.scenarioTemplates) {
      try {
        await this.dynamoDocClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            templateId: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }));

        log('info', `Seeded scenario template: ${template.title}`);
      } catch (error) {
        log('error', `Failed to seed scenario template ${template.title}:`, error);
      }
    }
  }

  async seedNotificationTemplates() {
    log('info', 'Seeding notification templates...');

    const tableName = `${this.dynamoPrefix}-notification-templates`;

    for (const template of seedData.notificationTemplates) {
      try {
        await this.dynamoDocClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            templateId: template.id,
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          ConditionExpression: 'attribute_not_exists(templateId)'
        }));

        log('info', `Seeded notification template: ${template.title}`);
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          log('info', `Notification template ${template.title} already exists, skipping`);
        } else {
          log('error', `Failed to seed notification template ${template.title}:`, error);
        }
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    
    if (this.dynamoClient) {
      this.dynamoClient.destroy();
    }
  }
}

// Run the seeder if called directly
if (require.main === module) {
  const seeder = new AutoSeeder();
  
  seeder.run()
    .then(() => {
      log('info', 'Seed process completed');
      process.exit(0);
    })
    .catch((error) => {
      log('error', 'Seed process failed:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('info', 'Received SIGINT, cleaning up...');
    await seeder.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('info', 'Received SIGTERM, cleaning up...');
    await seeder.cleanup();
    process.exit(0);
  });
}

module.exports = AutoSeeder;