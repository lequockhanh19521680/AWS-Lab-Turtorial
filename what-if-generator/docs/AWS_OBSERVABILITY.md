# AWS Observability Guide

## Overview

This document outlines the comprehensive observability strategy implemented using AWS CloudWatch, X-Ray, and CloudTrail for the What If Generator platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Observability Stack                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ CloudWatch  │    │    X-Ray    │    │ CloudTrail  │         │
│  │   Logs      │    │  Tracing    │    │   Audit     │         │
│  │  Metrics    │    │             │    │             │         │
│  │  Alarms     │    │             │    │             │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Application Services                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │
│  │  │   API   │ │  User   │ │ History │ │ Sharing │ ...  │   │
│  │  │Gateway  │ │ Service │ │ Service │ │ Service │      │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## CloudWatch Integration

### Log Management

#### Log Groups and Streams
```yaml
# CloudFormation Template
LogGroup:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: !Sub '/aws/ecs/${AWS::StackName}'
    RetentionInDays: 30
```

#### Application Logging
```javascript
// Winston logger with CloudWatch integration
const winston = require('winston');
const CloudWatchLogs = require('winston-cloudwatch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new CloudWatchLogs({
      logGroupName: process.env.CLOUDWATCH_GROUP,
      logStreamName: `${serviceName}-${Date.now()}`,
      region: process.env.AWS_REGION,
      retentionInDays: 14
    })
  ]
});
```

### Custom Metrics

#### API Metrics
```javascript
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

// Track API request metrics
async function trackAPIMetric(metricName, value, dimensions = {}) {
  const params = {
    Namespace: `${process.env.APP_NAME}/${process.env.NODE_ENV}`,
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: 'Count',
        Dimensions: Object.entries(dimensions).map(([key, value]) => ({
          Name: key,
          Value: String(value)
        })),
        Timestamp: new Date()
      }
    ]
  };

  await cloudwatch.putMetricData(params).promise();
}

// Usage
await trackAPIMetric('API_Requests', 1, {
  Service: 'api-gateway',
  Method: 'GET',
  Endpoint: '/api/scenarios',
  StatusCode: '200'
});
```

#### Business Metrics
```javascript
// Track scenario generation metrics
await trackAPIMetric('Scenarios_Generated', 1, {
  Service: 'generation-service',
  Provider: 'gemini',
  PromptType: 'fantasy'
});

// Track user engagement metrics
await trackAPIMetric('User_Login', 1, {
  Service: 'user-service',
  AuthMethod: 'jwt'
});
```

### CloudWatch Alarms

#### High-Level Alarms
```yaml
HighCPUAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-high-cpu'
    AlarmDescription: 'High CPU utilization'
    MetricName: CPUUtilization
    Namespace: AWS/ECS
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 80
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: ServiceName
        Value: !Ref APIService
      - Name: ClusterName
        Value: !Ref ECSCluster
```

#### Custom Metric Alarms
```yaml
HighErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-high-error-rate'
    AlarmDescription: 'High API error rate'
    MetricName: API_Errors
    Namespace: !Sub '${AWS::StackName}/${Environment}'
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 3
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
```

## X-Ray Tracing

### Configuration

#### Application Setup
```javascript
const AWSXRay = require('aws-xray-sdk-core');
const AWSXRayExpress = require('aws-xray-sdk-express');

// Initialize X-Ray
AWSXRay.setContextMissingStrategy('LOG_ERROR');
AWSXRay.middleware.setSamplingRules({
  version: 2,
  default: {
    fixed_target: 1,
    rate: 0.1 // 10% sampling rate
  },
  rules: [
    {
      description: 'Health check endpoints',
      service_name: process.env.APP_NAME,
      http_method: '*',
      url_path: '/health',
      fixed_target: 10,
      rate: 1.0
    }
  ]
});

// Express middleware
app.use(AWSXRayExpress.openSegment(process.env.APP_NAME));
```

#### Database Tracing
```javascript
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const dynamodb = new AWS.DynamoDB.DocumentClient();

// DynamoDB operations are automatically traced
async function getScenario(scenarioId) {
  return AWSXRay.captureAsyncFunc('getScenario', async (subsegment) => {
    subsegment.addAnnotation('scenarioId', scenarioId);
    subsegment.addMetadata('operation', 'getItem');
    
    try {
      const result = await dynamodb.get({
        TableName: 'scenarios',
        Key: { scenarioId }
      }).promise();
      
      subsegment.addMetadata('result', 'success');
      return result.Item;
    } catch (error) {
      subsegment.addMetadata('error', error.message);
      throw error;
    }
  });
}
```

#### HTTP Client Tracing
```javascript
const http = AWSXRay.captureHTTPs(require('http'));
const https = AWSXRay.captureHTTPs(require('https'));

// External API calls are automatically traced
async function callExternalAPI(url, data) {
  return AWSXRay.captureAsyncFunc('callExternalAPI', async (subsegment) => {
    subsegment.addAnnotation('url', url);
    subsegment.addMetadata('request', data);
    
    // HTTP request will be automatically traced
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response.json();
  });
}
```

### Custom Segments and Subsegments

#### Service-Level Tracing
```javascript
// API Gateway request tracing
app.post('/api/scenarios', async (req, res) => {
  return AWSXRay.captureAsyncFunc('createScenario', async (subsegment) => {
    try {
      subsegment.addAnnotation('userId', req.user.id);
      subsegment.addMetadata('request', {
        topic: req.body.topic,
        promptType: req.body.promptType
      });

      // Call generation service
      const scenario = await generationService.createScenario(req.body);
      
      subsegment.addMetadata('result', {
        scenarioId: scenario.id,
        tokensUsed: scenario.tokens
      });

      res.json({ success: true, data: scenario });
    } catch (error) {
      subsegment.addMetadata('error', error.message);
      res.status(500).json({ error: error.message });
    }
  });
});
```

#### Database Query Tracing
```javascript
async function getUserScenarios(userId, options = {}) {
  return AWSXRay.captureAsyncFunc('getUserScenarios', async (subsegment) => {
    subsegment.addAnnotation('userId', userId);
    subsegment.addMetadata('options', options);

    const startTime = Date.now();
    
    try {
      const scenarios = await Scenario.findByUserId(userId, options);
      const duration = Date.now() - startTime;
      
      subsegment.addMetadata('performance', {
        duration: duration,
        count: scenarios.length
      });

      return scenarios;
    } catch (error) {
      subsegment.addMetadata('error', error.message);
      throw error;
    }
  });
}
```

## CloudTrail Audit

### Configuration

#### CloudTrail Setup
```yaml
CloudTrail:
  Type: AWS::CloudTrail::Trail
  Properties:
    TrailName: !Sub '${AWS::StackName}-cloudtrail'
    S3BucketName: !Ref CloudTrailS3Bucket
    IncludeGlobalServiceEvents: true
    IsMultiRegionTrail: true
    EnableLogFileValidation: true
    EventSelectors:
      - ReadWriteType: All
        IncludeManagementEvents: true
        DataResources:
          - Type: AWS::S3::Object
            Values:
              - !Sub '${StaticAssetsBucket.Arn}/*'
          - Type: AWS::DynamoDB::Table
            Values:
              - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/what-if-generator-*'
```

### Custom Audit Logging

#### API Audit Events
```javascript
const cloudtrail = new AWS.CloudTrail();

async function logAPIAuditEvent(eventName, eventSource, requestParams, responseData, errorCode = null) {
  const event = {
    EventTime: new Date(),
    EventName: eventName,
    EventSource: eventSource,
    SourceIPAddress: req.ip || '127.0.0.1',
    UserAgent: req.get('User-Agent') || 'WhatIfGenerator/1.0',
    RequestParameters: requestParams,
    ResponseElements: responseData,
    ErrorCode: errorCode,
    ServiceEventDetails: {
      ServiceName: process.env.APP_NAME,
      Environment: process.env.NODE_ENV,
      UserId: req.user?.id || 'anonymous'
    }
  };

  // Log to CloudTrail (note: CloudTrail doesn't accept custom events directly)
  // Instead, we log to CloudWatch Logs with CloudTrail format
  logger.info('API Audit Event', event);
}
```

#### Database Audit Events
```javascript
async function logDatabaseAuditEvent(operation, tableName, key, userId) {
  const auditEvent = {
    timestamp: new Date().toISOString(),
    eventType: 'database_operation',
    operation: operation, // 'GET', 'PUT', 'UPDATE', 'DELETE'
    tableName: tableName,
    key: key,
    userId: userId,
    serviceName: process.env.APP_NAME,
    environment: process.env.NODE_ENV
  };

  logger.info('Database Audit Event', auditEvent);
}
```

## Monitoring Dashboards

### CloudWatch Dashboard

#### Service Overview
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "api-service"],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", "api-service"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "API Service Performance"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "scenarios"],
          ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", "scenarios"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "DynamoDB Usage"
      }
    }
  ]
}
```

#### Business Metrics Dashboard
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["WhatIfGenerator/Production", "Scenarios_Generated"],
          ["WhatIfGenerator/Production", "Users_Active"],
          ["WhatIfGenerator/Production", "API_Requests"]
        ],
        "period": 3600,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Business Metrics"
      }
    }
  ]
}
```

## Alerting and Notifications

### SNS Topics and Alarms

#### Critical Alerts
```yaml
CriticalAlertsTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: !Sub '${AWS::StackName}-critical-alerts'
    Subscription:
      - Protocol: email
        Endpoint: admin@whatifgenerator.com

CriticalErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-critical-errors'
    AlarmDescription: 'Critical system errors'
    MetricName: API_Errors
    Namespace: !Sub '${AWS::StackName}/${Environment}'
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref CriticalAlertsTopic
```

#### Performance Alerts
```yaml
PerformanceAlertsTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: !Sub '${AWS::StackName}-performance-alerts'

HighLatencyAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-high-latency'
    AlarmDescription: 'High API response latency'
    MetricName: API_Response_Time
    Namespace: !Sub '${AWS::StackName}/${Environment}'
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 2000
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref PerformanceAlertsTopic
```

## Log Analysis and Insights

### CloudWatch Insights Queries

#### Error Analysis
```sql
fields @timestamp, @message, service, level
| filter level = "error"
| sort @timestamp desc
| limit 100
```

#### Performance Analysis
```sql
fields @timestamp, @message, duration, endpoint
| filter @message like /API_Request/
| stats avg(duration) by endpoint
| sort avg(duration) desc
```

#### User Activity Analysis
```sql
fields @timestamp, @message, userId, action
| filter @message like /User_Activity/
| stats count() by userId
| sort count() desc
| limit 50
```

### X-Ray Service Map Analysis

#### Service Dependencies
```javascript
// Analyze service dependencies from X-Ray traces
const serviceMap = {
  'api-gateway': ['user-service', 'generation-service', 'history-service'],
  'generation-service': ['history-service'],
  'sharing-service': ['history-service', 'user-service']
};

// Identify bottlenecks and optimization opportunities
const analyzeServicePerformance = (traces) => {
  const serviceStats = {};
  
  traces.forEach(trace => {
    trace.segments.forEach(segment => {
      if (!serviceStats[segment.name]) {
        serviceStats[segment.name] = {
          totalDuration: 0,
          count: 0,
          errors: 0
        };
      }
      
      serviceStats[segment.name].totalDuration += segment.duration;
      serviceStats[segment.name].count++;
      
      if (segment.error) {
        serviceStats[segment.name].errors++;
      }
    });
  });
  
  return serviceStats;
};
```

## Troubleshooting Guide

### Common Issues and Solutions

#### High Memory Usage
```bash
# CloudWatch Insights Query
fields @timestamp, @message, memory
| filter @message like /Memory/
| sort @timestamp desc
| limit 100

# X-Ray Analysis
# Look for memory leaks in long-running operations
```

#### Database Connection Issues
```bash
# CloudWatch Insights Query
fields @timestamp, @message, error
| filter @message like /Database/
| filter error like /connection/
| sort @timestamp desc

# X-Ray Analysis
# Check database connection patterns and timeouts
```

#### API Performance Issues
```bash
# CloudWatch Insights Query
fields @timestamp, @message, duration, endpoint
| filter @message like /API_Request/
| filter duration > 5000
| sort duration desc
| limit 50

# X-Ray Analysis
# Trace slow API calls to identify bottlenecks
```

### Debugging Commands

```bash
# View recent logs
aws logs tail /aws/ecs/what-if-generator-production --follow

# Get X-Ray trace summary
aws xray get-trace-summaries --start-time 2023-01-01T00:00:00Z --end-time 2023-01-01T23:59:59Z

# List CloudTrail events
aws logs describe-log-groups --log-group-name-prefix /aws/cloudtrail

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace "WhatIfGenerator/Production" \
  --metric-name "API_Requests" \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Best Practices

### Logging Best Practices
1. **Structured Logging**: Use JSON format for all logs
2. **Log Levels**: Use appropriate log levels (ERROR, WARN, INFO, DEBUG)
3. **Context**: Include relevant context (userId, requestId, etc.)
4. **Sensitive Data**: Never log passwords, tokens, or PII
5. **Performance**: Use async logging to avoid blocking

### Tracing Best Practices
1. **Sampling**: Use appropriate sampling rates for production
2. **Annotations**: Add meaningful annotations to segments
3. **Error Handling**: Always capture errors in traces
4. **Performance**: Keep trace overhead minimal
5. **Cleanup**: Close segments properly to avoid memory leaks

### Monitoring Best Practices
1. **SLIs/SLOs**: Define service level indicators and objectives
2. **Alerting**: Set up meaningful alerts with appropriate thresholds
3. **Dashboards**: Create focused dashboards for different audiences
4. **Documentation**: Document all monitoring and alerting procedures
5. **Testing**: Regularly test alerting and incident response procedures

## Cost Optimization

### CloudWatch Costs
- Use appropriate log retention periods
- Implement log filtering to reduce volume
- Use metric filters instead of custom metrics when possible
- Monitor CloudWatch costs regularly

### X-Ray Costs
- Adjust sampling rates based on traffic volume
- Use sampling rules to focus on important requests
- Clean up old traces regularly
- Monitor X-Ray costs and usage

### CloudTrail Costs
- Use appropriate event selectors
- Implement log file validation
- Archive old logs to S3 for long-term retention
- Monitor CloudTrail costs and usage

## Security Considerations

### Log Security
- Encrypt log data at rest and in transit
- Implement proper access controls for log groups
- Use VPC endpoints for private access
- Monitor log access and modifications

### Trace Security
- Avoid logging sensitive data in trace annotations
- Implement proper IAM roles for X-Ray access
- Use VPC endpoints for private access
- Monitor trace access and usage

### Audit Security
- Enable CloudTrail log file validation
- Use separate S3 buckets for CloudTrail logs
- Implement proper access controls
- Monitor CloudTrail configuration changes