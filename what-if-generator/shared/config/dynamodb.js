/**
 * DynamoDB Configuration and Client
 * Supports local DynamoDB for development and AWS DynamoDB for test/production
 */

const AWS = require('aws-sdk');
const { getDynamoDBConfig, getDynamoDBTables, isDevelopment } = require('./database');

class DynamoDBClient {
  constructor() {
    this.config = getDynamoDBConfig();
    this.tables = getDynamoDBTables();
    this.isLocal = isDevelopment();
    
    // Configure AWS SDK
    if (this.isLocal) {
      AWS.config.update({
        region: this.config.region,
        endpoint: this.config.endpoint,
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      });
    } else {
      AWS.config.update({
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      });
    }

    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    this.dynamodbService = new AWS.DynamoDB();
  }

  /**
   * Create DynamoDB tables if they don't exist
   */
  async createTables() {
    if (!this.isLocal) {
      console.log('ℹ️ Skipping table creation in AWS environment (tables should exist)');
      return;
    }

    console.log('🔧 Creating DynamoDB tables for local development...');

    for (const [tableName, tableConfig] of Object.entries(this.tables)) {
      try {
        // Check if table exists
        try {
          await this.dynamodbService.describeTable({ TableName: tableConfig.TableName }).promise();
          console.log(`✅ Table ${tableConfig.TableName} already exists`);
          continue;
        } catch (error) {
          if (error.code !== 'ResourceNotFoundException') {
            throw error;
          }
        }

        // Create table
        await this.dynamodbService.createTable(tableConfig).promise();
        console.log(`✅ Created table: ${tableConfig.TableName}`);

        // Wait for table to be active
        await this.dynamodbService.waitFor('tableExists', { TableName: tableConfig.TableName }).promise();
        console.log(`✅ Table ${tableConfig.TableName} is active`);

      } catch (error) {
        console.error(`❌ Failed to create table ${tableConfig.TableName}:`, error.message);
      }
    }
  }

  /**
   * Put item in DynamoDB table
   */
  async putItem(tableName, item) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const params = {
        TableName: tableConfig.TableName,
        Item: {
          ...item,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      const result = await this.dynamodb.put(params).promise();
      return result;
    } catch (error) {
      console.error(`Error putting item to ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get item from DynamoDB table
   */
  async getItem(tableName, key) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const params = {
        TableName: tableConfig.TableName,
        Key: key
      };

      const result = await this.dynamodb.get(params).promise();
      return result.Item;
    } catch (error) {
      console.error(`Error getting item from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Query items from DynamoDB table
   */
  async query(tableName, keyConditionExpression, expressionAttributeValues, indexName = null) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const params = {
        TableName: tableConfig.TableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues
      };

      if (indexName) {
        params.IndexName = indexName;
      }

      const result = await this.dynamodb.query(params).promise();
      return result.Items;
    } catch (error) {
      console.error(`Error querying ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update item in DynamoDB table
   */
  async updateItem(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = null) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const params = {
        TableName: tableConfig.TableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'UPDATED_NEW'
      };

      if (expressionAttributeNames) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const result = await this.dynamodb.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error(`Error updating item in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete item from DynamoDB table
   */
  async deleteItem(tableName, key) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const params = {
        TableName: tableConfig.TableName,
        Key: key
      };

      const result = await this.dynamodb.delete(params).promise();
      return result;
    } catch (error) {
      console.error(`Error deleting item from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Scan items from DynamoDB table (use with caution)
   */
  async scan(tableName, filterExpression = null, expressionAttributeValues = null) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const params = {
        TableName: tableConfig.TableName
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
      }

      if (expressionAttributeValues) {
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      const result = await this.dynamodb.scan(params).promise();
      return result.Items;
    } catch (error) {
      console.error(`Error scanning ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Batch write items to DynamoDB table
   */
  async batchWrite(tableName, items) {
    try {
      const tableConfig = this.tables[tableName];
      if (!tableConfig) {
        throw new Error(`Table ${tableName} not found in configuration`);
      }

      const requests = items.map(item => ({
        PutRequest: {
          Item: {
            ...item,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }));

      const params = {
        RequestItems: {
          [tableConfig.TableName]: requests
        }
      };

      const result = await this.dynamodb.batchWrite(params).promise();
      return result;
    } catch (error) {
      console.error(`Error batch writing to ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get table name for environment
   */
  getTableName(tableName) {
    const tableConfig = this.tables[tableName];
    return tableConfig ? tableConfig.TableName : null;
  }

  /**
   * Health check for DynamoDB connection
   */
  async healthCheck() {
    try {
      // Try to list tables to check connection
      const result = await this.dynamodbService.listTables().promise();
      return {
        status: 'healthy',
        tables: result.TableNames,
        environment: this.isLocal ? 'local' : 'aws'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        environment: this.isLocal ? 'local' : 'aws'
      };
    }
  }
}

// Create singleton instance
const dynamoDBClient = new DynamoDBClient();

module.exports = {
  dynamoDBClient,
  DynamoDBClient,
  // Convenience methods
  putItem: (tableName, item) => dynamoDBClient.putItem(tableName, item),
  getItem: (tableName, key) => dynamoDBClient.getItem(tableName, key),
  query: (tableName, keyConditionExpression, expressionAttributeValues, indexName) => 
    dynamoDBClient.query(tableName, keyConditionExpression, expressionAttributeValues, indexName),
  updateItem: (tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames) => 
    dynamoDBClient.updateItem(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames),
  deleteItem: (tableName, key) => dynamoDBClient.deleteItem(tableName, key),
  scan: (tableName, filterExpression, expressionAttributeValues) => 
    dynamoDBClient.scan(tableName, filterExpression, expressionAttributeValues),
  batchWrite: (tableName, items) => dynamoDBClient.batchWrite(tableName, items),
  getTableName: (tableName) => dynamoDBClient.getTableName(tableName),
  healthCheck: () => dynamoDBClient.healthCheck(),
  createTables: () => dynamoDBClient.createTables()
};