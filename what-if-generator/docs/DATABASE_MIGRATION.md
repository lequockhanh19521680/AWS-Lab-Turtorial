# Database Migration Guide

## Overview

This document outlines the migration from MongoDB/DocumentDB to DynamoDB and the transition from local PostgreSQL to AWS RDS PostgreSQL across different environments.

## Migration Strategy

### Environment-Specific Database Configuration

| Environment | PostgreSQL | DynamoDB | Redis |
|-------------|------------|----------|-------|
| **Development** | Local Docker | Local DynamoDB | Local Redis |
| **Test** | AWS RDS | AWS DynamoDB | AWS ElastiCache |
| **Production** | AWS RDS | AWS DynamoDB | AWS ElastiCache |

## MongoDB to DynamoDB Migration

### Schema Mapping

#### Scenarios Collection
```javascript
// MongoDB Schema
{
  _id: ObjectId,
  scenarioId: String,
  userId: String,
  topic: String,
  content: String,
  promptType: String,
  tags: [String],
  isPublic: Boolean,
  shareUrl: String,
  createdAt: Date,
  updatedAt: Date
}

// DynamoDB Schema
{
  scenarioId: String (Primary Key),
  userId: String,
  topic: String,
  content: String,
  promptType: String,
  tags: [String],
  isPublic: Boolean,
  shareUrl: String,
  createdAt: String (ISO 8601),
  updatedAt: String (ISO 8601)
}
```

#### Global Secondary Indexes (GSI)

1. **userId-createdAt-index**
   - Partition Key: userId
   - Sort Key: createdAt
   - Purpose: Query scenarios by user with date sorting

2. **isPublic-createdAt-index**
   - Partition Key: isPublic
   - Sort Key: createdAt
   - Purpose: Query public scenarios

### Migration Scripts

#### 1. Setup DynamoDB Tables
```bash
node scripts/setup-dynamodb-tables.js development
node scripts/setup-dynamodb-tables.js test
node scripts/setup-dynamodb-tables.js production
```

#### 2. Data Migration
```bash
# Development (local to local)
node scripts/migrate-to-aws.js development --dry-run

# Test (local to AWS)
node scripts/migrate-to-aws.js test --backup

# Production (AWS to AWS)
node scripts/migrate-to-aws.js production --backup
```

### Migration Process

1. **Pre-migration**
   - Backup existing MongoDB data
   - Create DynamoDB tables
   - Validate table schemas

2. **Migration**
   - Transform MongoDB documents to DynamoDB format
   - Handle data type conversions
   - Update timestamps to ISO 8601 format
   - Generate UUIDs for missing primary keys

3. **Post-migration**
   - Verify data integrity
   - Update application code
   - Test queries and operations
   - Monitor performance

## PostgreSQL to AWS RDS Migration

### Database Configuration

#### Local Development
```yaml
# docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: what_if_users
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres123
  ports:
    - "5432:5432"
```

#### AWS RDS (Test/Production)
```yaml
# CloudFormation Template
Database:
  Type: AWS::RDS::DBInstance
  Properties:
    DBInstanceClass: db.t3.micro
    Engine: postgres
    EngineVersion: '15.4'
    MasterUsername: postgres
    MasterUserPassword: !Ref DatabasePassword
    AllocatedStorage: 20
    MultiAZ: true
    StorageEncrypted: true
```

### Connection Configuration

#### Development
```javascript
const config = {
  host: 'localhost',
  port: 5432,
  database: 'what_if_users',
  username: 'postgres',
  password: 'postgres123',
  dialect: 'postgres',
  logging: console.log
};
```

#### AWS RDS
```javascript
const config = {
  host: process.env.RDS_POSTGRES_HOST,
  port: process.env.RDS_POSTGRES_PORT,
  database: process.env.RDS_POSTGRES_DB,
  username: process.env.RDS_POSTGRES_USER,
  password: process.env.RDS_POSTGRES_PASSWORD,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};
```

## Redis to ElastiCache Migration

### Local Development
```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

### AWS ElastiCache
```yaml
# CloudFormation Template
RedisCluster:
  Type: AWS::ElastiCache::ReplicationGroup
  Properties:
    NodeType: cache.t3.micro
    NumCacheClusters: 2
    Engine: redis
    EngineVersion: '7.0'
    AtRestEncryptionEnabled: true
    TransitEncryptionEnabled: true
    MultiAZEnabled: true
```

## Migration Scripts Reference

### setup-dynamodb-tables.js
Creates all required DynamoDB tables with proper indexes and configurations.

**Usage:**
```bash
node scripts/setup-dynamodb-tables.js [environment] [options]

Options:
  --region <region>    AWS region (default: us-east-1)
  --force             Force recreate existing tables
```

### migrate-to-aws.js
Migrates data from source databases to AWS managed services.

**Usage:**
```bash
node scripts/migrate-to-aws.js [environment] [options]

Options:
  --dry-run          Perform migration without making changes
  --backup           Create backup of source databases
  --batch-size <n>   Batch size for DynamoDB writes (default: 100)
```

## Data Transformation Examples

### MongoDB to DynamoDB

#### Original MongoDB Document
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  scenarioId: "scenario_123",
  userId: "user_456",
  topic: "What if humans could fly?",
  content: "In a world where humans could fly...",
  tags: ["fantasy", "sci-fi"],
  isPublic: true,
  createdAt: ISODate("2023-01-01T00:00:00Z"),
  updatedAt: ISODate("2023-01-01T00:00:00Z")
}
```

#### Transformed DynamoDB Item
```javascript
{
  scenarioId: "scenario_123",
  userId: "user_456",
  topic: "What if humans could fly?",
  content: "In a world where humans could fly...",
  tags: ["fantasy", "sci-fi"],
  isPublic: true,
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z"
}
```

### Query Translation

#### MongoDB Query
```javascript
// Find user scenarios sorted by creation date
db.scenarios.find({ userId: "user_456" }).sort({ createdAt: -1 }).limit(20)
```

#### DynamoDB Query
```javascript
// Query using GSI
const params = {
  TableName: 'what-if-generator-scenarios-production',
  IndexName: 'userId-createdAt-index',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'user_456'
  },
  ScanIndexForward: false, // Descending order
  Limit: 20
};
```

## Rollback Strategy

### DynamoDB Rollback
1. Keep MongoDB containers running during migration
2. Maintain data synchronization until migration is verified
3. Use migration scripts with `--dry-run` for testing
4. Keep backups of all data before migration

### PostgreSQL Rollback
1. Maintain local PostgreSQL instance during RDS migration
2. Use database dumps for backup/restore
3. Test application connectivity before switching
4. Keep connection strings configurable via environment variables

## Performance Considerations

### DynamoDB
- Use appropriate partition keys to avoid hot partitions
- Implement query patterns efficiently with GSIs
- Consider on-demand billing for unpredictable workloads
- Monitor read/write capacity utilization

### RDS PostgreSQL
- Use connection pooling (PgBouncer)
- Implement read replicas for read-heavy workloads
- Monitor slow query logs
- Use appropriate instance types based on workload

### ElastiCache Redis
- Configure appropriate node types
- Use Redis clustering for high availability
- Implement proper key expiration policies
- Monitor memory usage and eviction policies

## Monitoring and Alerting

### CloudWatch Metrics
- DynamoDB: Read/Write capacity, throttling, errors
- RDS: CPU utilization, connections, storage
- ElastiCache: CPU, memory, cache hits/misses

### X-Ray Tracing
- Database query performance
- Connection pool utilization
- Error rates and patterns

### CloudTrail Audit
- Database access patterns
- Configuration changes
- Security events

## Troubleshooting

### Common Issues

1. **DynamoDB Throttling**
   - Increase read/write capacity
   - Implement exponential backoff
   - Use batch operations

2. **RDS Connection Limits**
   - Increase max connections
   - Implement connection pooling
   - Use read replicas

3. **ElastiCache Memory Issues**
   - Increase node size
   - Implement key expiration
   - Monitor eviction policies

### Debug Commands

```bash
# Check DynamoDB table status
aws dynamodb describe-table --table-name what-if-generator-scenarios-production

# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier what-if-generator-postgres

# Check ElastiCache cluster status
aws elasticache describe-replication-groups --replication-group-id what-if-generator-redis
```

## Best Practices

1. **Always test migrations in development first**
2. **Use feature flags for gradual rollout**
3. **Monitor performance metrics during migration**
4. **Keep rollback plans ready**
5. **Document all configuration changes**
6. **Use infrastructure as code (CloudFormation)**
7. **Implement proper backup strategies**
8. **Test disaster recovery procedures**

## Migration Checklist

### Pre-Migration
- [ ] Backup all existing data
- [ ] Test migration scripts in development
- [ ] Validate AWS permissions and configurations
- [ ] Create monitoring dashboards
- [ ] Prepare rollback procedures

### Migration
- [ ] Run migration scripts
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Monitor performance metrics
- [ ] Update application configurations

### Post-Migration
- [ ] Validate all services are working
- [ ] Update documentation
- [ ] Clean up old resources (if applicable)
- [ ] Train team on new configurations
- [ ] Schedule regular maintenance windows