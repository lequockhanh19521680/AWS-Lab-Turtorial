# AWS Free Tier Deployment Guide (Under $50/month)

## 📊 Cost Breakdown & Free Tier Limits

### Free Tier Resources (12 months from AWS signup)

| Service | Free Tier Limit | Monthly Cost if Exceeded |
|---------|----------------|--------------------------|
| **ECS Fargate** | None (pay per use) | ~$15-25 for minimal usage |
| **RDS PostgreSQL** | 750 hours t3.micro, 20GB storage | $0 within limits |
| **DynamoDB** | 25GB storage, 25 RCU/WCU | $0 within limits |
| **S3** | 5GB storage, 20,000 GET, 2,000 PUT | $0 within limits |
| **CloudWatch Logs** | 5GB ingestion, 5GB storage | $0 within limits |
| **Application Load Balancer** | 750 hours | $0 within limits |
| **NAT Gateway** | NOT included in free tier | ~$32/month |
| **Data Transfer** | 1GB out per month | $0 within limits |

### **Estimated Total Monthly Cost: $35-45 USD** 🎯

## 🏗️ Free Tier Optimized Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Free Tier Setup                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Internet Gateway (Free) → ALB (750h free) → ECS Fargate       │
│                                                ↓                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Single AZ Deployment                     │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │    VPC      │    │   RDS t3.micro  │    │  DynamoDB   │  │   │
│  │  │ 10.0.0.0/16 │    │   (750h free)   │    │  (25GB free)│  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  S3 (5GB free) + CloudWatch Logs (5GB free)                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Steps

### Prerequisites
```bash
# AWS CLI v2 installed and configured
aws --version

# Set your AWS region (choose cheapest: us-east-1)
export AWS_DEFAULT_REGION=us-east-1

# Verify free tier eligibility
aws support describe-services --language en
```

### Step 1: Deploy Free Tier Infrastructure
```bash
# Deploy optimized infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure-free-tier.yaml \
  --stack-name what-if-generator-freetier \
  --parameter-overrides \
    Environment=development \
    DBMasterUsername=postgres \
    DBMasterPassword=YourSecurePassword123! \
  --capabilities CAPABILITY_IAM \
  --region us-east-1

# Wait for completion (10-15 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name what-if-generator-freetier \
  --region us-east-1
```

### Step 2: Setup ECR Repository (Free Tier: 500MB)
```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name what-if-generator/api-gateway \
  --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
```

### Step 3: Build and Push Docker Image
```bash
# Build API Gateway image
cd api-gateway
docker build -t what-if-generator/api-gateway .

# Tag and push to ECR
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
docker tag what-if-generator/api-gateway:latest \
  $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/what-if-generator/api-gateway:latest

docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/what-if-generator/api-gateway:latest
```

### Step 4: Update ECS Service
```bash
# Force new deployment
aws ecs update-service \
  --cluster what-if-generator-freetier-cluster \
  --service what-if-generator-freetier-api-gateway \
  --force-new-deployment \
  --region us-east-1
```

## 💰 Cost Monitoring & Optimization

### Setup Billing Alerts
```bash
# Create billing alarm (requires us-east-1)
aws cloudwatch put-metric-alarm \
  --alarm-name "FreeTierBilling" \
  --alarm-description "Alert when estimated charges exceed $40" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 40.0 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD \
  --evaluation-periods 1 \
  --region us-east-1
```

### Daily Cost Check Script
```bash
#!/bin/bash
# save as scripts/check-costs.sh

echo "🔍 Checking AWS costs..."

# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --region us-east-1

echo "💡 Free Tier usage remaining:"
aws support describe-trusted-advisor-checks \
  --language en \
  --region us-east-1 | \
  grep -i "free tier"
```

### Resource Cleanup Commands
```bash
# Stop ECS service (saves Fargate costs)
aws ecs update-service \
  --cluster what-if-generator-freetier-cluster \
  --service what-if-generator-freetier-api-gateway \
  --desired-count 0 \
  --region us-east-1

# Delete RDS instance (if needed)
aws rds delete-db-instance \
  --db-instance-identifier what-if-generator-freetier-postgres \
  --skip-final-snapshot \
  --region us-east-1

# Empty and delete S3 bucket
aws s3 rm s3://what-if-generator-freetier-static-assets-$(aws sts get-caller-identity --query Account --output text) --recursive
```

## 🔧 Configuration Optimizations

### Environment Variables for Cost Optimization
```bash
# In .env.production
NODE_ENV=production
PORT=3000

# Database config (single connection)
POSTGRES_POOL_MIN=1
POSTGRES_POOL_MAX=5
POSTGRES_IDLE_TIMEOUT=30000

# DynamoDB config (conservative usage)
DYNAMODB_READ_CAPACITY=5
DYNAMODB_WRITE_CAPACITY=5

# CloudWatch logging (reduced verbosity)
LOG_LEVEL=warn
LOG_RETENTION_DAYS=7

# S3 config (lifecycle management)
S3_LIFECYCLE_ENABLED=true
S3_EXPIRATION_DAYS=30
```

### Application-Level Optimizations
```javascript
// In api-gateway/src/config/database.js
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: 5432,
  // Cost optimization settings
  min: 1,           // Minimum connections
  max: 5,           // Maximum connections (free tier limit)
  idleTimeoutMillis: 30000,  // Close idle connections
  connectionTimeoutMillis: 5000,
});

// DynamoDB optimization
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  // Use consistent reads sparingly (costs 2x)
  consistentRead: false,
  // Batch operations when possible
  maxRetries: 3,
  retryDelayOptions: {
    customBackoff: function(retryCount) {
      return Math.pow(2, retryCount) * 100;
    }
  }
});
```

## 📊 Monitoring Free Tier Usage

### CloudWatch Dashboard (Free Tier)
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Billing", "EstimatedCharges", "Currency", "USD"],
          ["AWS/ECS", "CPUUtilization", "ServiceName", "what-if-generator-freetier-api-gateway"],
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "what-if-generator-freetier-postgres"],
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "what-if-generator-freetier-scenarios"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Free Tier Monitoring"
      }
    }
  ]
}
```

### Free Tier Usage Tracking
```bash
# Check ECS Fargate usage
aws ecs describe-services \
  --cluster what-if-generator-freetier-cluster \
  --services what-if-generator-freetier-api-gateway \
  --region us-east-1

# Check RDS usage
aws rds describe-db-instances \
  --db-instance-identifier what-if-generator-freetier-postgres \
  --region us-east-1

# Check DynamoDB usage
aws dynamodb describe-table \
  --table-name what-if-generator-freetier-scenarios \
  --region us-east-1

# Check S3 usage
aws s3api head-bucket \
  --bucket what-if-generator-freetier-static-assets-$(aws sts get-caller-identity --query Account --output text)
```

## ⚠️ Cost Warnings & Limits

### Services NOT Included in Free Tier
- **NAT Gateway**: ~$32/month (largest cost)
- **Data Transfer**: Beyond 1GB/month
- **RDS Multi-AZ**: Not included
- **ElastiCache**: Not included
- **CloudFront**: 50GB transfer limit

### Free Tier Exhaustion Scenarios
```bash
# If you exceed free tier limits:
# 1. RDS: Switch to db.t3.micro if possible
# 2. DynamoDB: Monitor read/write capacity
# 3. S3: Implement aggressive lifecycle policies
# 4. CloudWatch: Reduce log retention
# 5. ECS: Use Fargate Spot instances
```

## 🎯 Best Practices for Under $50/month

### 1. Use Single AZ Deployment
- No Multi-AZ RDS (saves ~$15/month)
- Single NAT Gateway (saves ~$32/month vs 2)
- Single subnet architecture

### 2. Optimize Resource Usage
- ECS: CPU 256, Memory 512MB (minimal)
- RDS: db.t3.micro only
- DynamoDB: Provisioned capacity (5 RCU/WCU)

### 3. Implement Auto-Scaling Down
```bash
# Schedule to stop services at night
aws events put-rule \
  --name "StopECSNightly" \
  --schedule-expression "cron(0 22 * * ? *)" \
  --state ENABLED \
  --region us-east-1
```

### 4. Use Lifecycle Policies
```yaml
# S3 Lifecycle (in CloudFormation)
LifecycleConfiguration:
  Rules:
    - Id: DeleteOldFiles
      Status: Enabled
      ExpirationInDays: 30
      Transitions:
        - TransitionInDays: 7
          StorageClass: STANDARD_IA
```

### 5. Monitor Daily
```bash
# Daily cost check (add to cron)
0 9 * * * /path/to/scripts/check-costs.sh
```

## 🚨 Emergency Cost Control

### If Costs Exceed $40
```bash
# 1. Stop ECS service immediately
aws ecs update-service \
  --cluster what-if-generator-freetier-cluster \
  --service what-if-generator-freetier-api-gateway \
  --desired-count 0

# 2. Delete NAT Gateway (breaks private subnet internet access)
aws ec2 delete-nat-gateway \
  --nat-gateway-id $(aws ec2 describe-nat-gateways \
    --filter "Name=tag:Name,Values=what-if-generator-freetier-nat" \
    --query 'NatGateways[0].NatGatewayId' --output text)

# 3. Switch to public subnet deployment (less secure but cheaper)
# Modify ECS service to use public subnet with AssignPublicIp: ENABLED
```

## ✅ Success Criteria

### Monthly Targets
- **Total Cost**: Under $45 USD
- **Free Tier Usage**: Under 80% of limits
- **Performance**: Response time < 2 seconds
- **Uptime**: 99% availability during business hours

### Monitoring Checklist
- [ ] Billing alert set at $40
- [ ] Daily cost monitoring
- [ ] Free tier usage tracking
- [ ] Resource optimization
- [ ] Automated scaling policies

---

**Remember**: The key to staying under $50/month is vigilant monitoring and aggressive cost optimization. The NAT Gateway is your biggest expense (~$32/month), so consider public subnet deployment for development environments.