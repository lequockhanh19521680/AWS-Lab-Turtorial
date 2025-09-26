# 🚀 Deployment Guide - What If Generator

> Hướng dẫn triển khai toàn diện với AWS DevOps best practices (DVA) và Production Architecture (SAA)

## 📋 Tổng Quan

Dự án What If Generator được thiết kế với kiến trúc 3 môi trường:
- **Development**: Tự động deploy khi commit code lên branch `develop`
- **Test**: Tự động deploy khi commit code lên branch `test`
- **Production**: Manual approval required, deploy từ branch `main`

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AWS Production Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ CloudFront  │    │     WAF     │    │     ALB     │         │
│  │    (CDN)    │◄──►│  Security   │◄──►│Load Balancer│         │
│  │  S3 Static  │    │ Protection  │    │Multi-AZ     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                                      │                │
│         ▼                                      ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ECS Fargate Cluster                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │
│  │  │   API   │ │  User   │ │History  │ │ Social  │ ...  │   │
│  │  │Gateway  │ │ Service │ │Service  │ │Service  │      │   │
│  │  │Auto-Scale│ │Auto-Scale│ │Auto-Scale│ │Auto-Scale│      │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │               │               │               │       │
│         ▼               ▼               ▼               ▼       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │RDS PostgreSQL│ │  DynamoDB   │ │ElastiCache  │ │     S3      ││
│  │  Multi-AZ   │ │Multi-Region │ │   Redis     │ │  Buckets    ││
│  │   Backup    │ │Point-in-Time│ │  Cluster    │ │ Lifecycle   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Prerequisites

### 1. AWS Account Setup
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
```

### 2. Required Tools
```bash
# Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git
sudo apt-get install git -y
```

### 3. GitHub Setup
- Personal Access Token với repo permissions
- Repository với branches: `develop`, `test`, `main`
- Webhook configuration (tự động setup qua pipeline)

## 📱 Step 1: Clone và Setup Project

```bash
# Clone repository
git clone https://github.com/your-username/what-if-generator.git
cd what-if-generator

# Cài đặt dependencies
npm install

# Copy environment files
cp .env.example .env.local
cp .env.example .env.development
cp .env.example .env.test
cp .env.example .env.production
```

### Cập nhật Environment Variables

#### .env.local (Development)
```bash
# Service Configuration
NODE_ENV=development
API_GATEWAY_PORT=3000
FRONTEND_PORT=3007

# Database (Local Docker)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=what_if_users
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

REDIS_URL=redis://localhost:6379
DYNAMODB_ENDPOINT=http://localhost:8000

# AI Providers
GEMINI_API_KEY=your-gemini-api-key
AI_PROVIDER=gemini

# Security
JWT_SECRET=your-super-secret-jwt-key-development
CORS_ORIGIN=http://localhost:3007

# AWS (for local AWS services)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

#### .env.production (Production)
```bash
# Service Configuration
NODE_ENV=production
PORT=3000

# Database (AWS RDS/ElastiCache/DynamoDB)
POSTGRES_HOST=${resolve:secretsmanager:what-if-generator-prod/database:SecretString:host}
POSTGRES_PORT=5432
POSTGRES_DB=what_if_users
POSTGRES_USER=${resolve:secretsmanager:what-if-generator-prod/database:SecretString:username}
POSTGRES_PASSWORD=${resolve:secretsmanager:what-if-generator-prod/database:SecretString:password}

REDIS_URL=${resolve:secretsmanager:what-if-generator-prod/redis:SecretString:url}

# AI Providers
GEMINI_API_KEY=${resolve:secretsmanager:what-if-generator-prod/gemini:SecretString:api_key}
AI_PROVIDER=gemini

# Security
JWT_SECRET=${resolve:secretsmanager:what-if-generator-prod/jwt:SecretString:secret}
CORS_ORIGIN=https://your-domain.com

# AWS
AWS_REGION=us-east-1
DYNAMODB_TABLE_PREFIX=what-if-generator-prod
S3_BUCKET=what-if-generator-prod-static-assets
```

## 🏭 Step 2: Deploy AWS Infrastructure

### 2.1 Deploy CI/CD Pipeline

```bash
# Deploy CI/CD pipeline infrastructure
aws cloudformation deploy \
  --template-file aws/cicd-pipeline.yaml \
  --stack-name what-if-generator-pipeline \
  --parameter-overrides \
    GitHubOwner=your-github-username \
    GitHubRepo=what-if-generator \
    GitHubToken=ghp_your_github_token \
    DockerHubUsername=your-dockerhub-username \
    DockerHubPassword=your-dockerhub-password \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### 2.2 Deploy Development Environment

```bash
# Deploy development infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-dev \
  --parameter-overrides \
    Environment=development \
    DBMasterUsername=postgres \
    DBMasterPassword=DevPassword123! \
    KeyPairName=your-key-pair \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### 2.3 Deploy Test Environment

```bash
# Deploy test infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-test \
  --parameter-overrides \
    Environment=test \
    DBMasterUsername=postgres \
    DBMasterPassword=TestPassword123! \
    KeyPairName=your-key-pair \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### 2.4 Deploy Production Environment

```bash
# Deploy production infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-prod \
  --parameter-overrides \
    Environment=production \
    DBMasterUsername=postgres \
    DBMasterPassword=ProductionPassword123! \
    KeyPairName=your-key-pair \
    DomainName=your-domain.com \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## 🐳 Step 3: Build và Push Docker Images

### 3.1 Login to ECR

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Set variables
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export ECR_PREFIX=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/what-if-generator
```

### 3.2 Build và Push Images

```bash
# Build and push all services
services=("api-gateway" "user-service" "generation-service" "history-service" "sharing-service" "video-service" "social-service" "frontend")

for service in "${services[@]}"; do
  echo "Building $service..."
  
  if [ "$service" = "frontend" ]; then
    docker build -t $ECR_PREFIX/$service:latest ./frontend/
  elif [ "$service" = "api-gateway" ]; then
    docker build -t $ECR_PREFIX/$service:latest ./api-gateway/
  else
    docker build -t $ECR_PREFIX/$service:latest ./services/$service/
  fi
  
  docker push $ECR_PREFIX/$service:latest
  echo "Pushed $service successfully"
done
```

## 🚦 Step 4: CI/CD Workflow

### 4.1 Development Workflow

```bash
# Work on development branch
git checkout develop

# Make changes
git add .
git commit -m "feat: add new feature"
git push origin develop

# Pipeline tự động:
# 1. Trigger on push to develop
# 2. Run unit tests
# 3. Build Docker images
# 4. Push to ECR
# 5. Auto deploy to development environment
```

### 4.2 Test Workflow

```bash
# Merge to test branch
git checkout test
git merge develop
git push origin test

# Pipeline tự động:
# 1. Trigger on push to test
# 2. Run comprehensive tests
# 3. Build Docker images
# 4. Push to ECR
# 5. Auto deploy to test environment
```

### 4.3 Production Workflow

```bash
# Merge to main branch
git checkout main
git merge test
git push origin main

# Pipeline workflow:
# 1. Trigger on push to main
# 2. Run all tests (unit + integration)
# 3. Build Docker images
# 4. Push to ECR
# 5. **MANUAL APPROVAL REQUIRED** ⚠️
# 6. Deploy to production (after approval)
```

### Manual Approval Process

1. **Check SNS Notification**: Người phụ trách sẽ nhận email
2. **Review Changes**: Kiểm tra changes trong AWS Console
3. **Approve/Reject**: Trong CodePipeline console
4. **Monitor Deployment**: Theo dõi deployment progress

## 📊 Step 5: Monitoring và Health Checks

### 5.1 Health Check Endpoints

```bash
# Development
curl https://dev-alb-dns.us-east-1.elb.amazonaws.com/health

# Test
curl https://test-alb-dns.us-east-1.elb.amazonaws.com/health

# Production
curl https://your-domain.com/health
```

### 5.2 CloudWatch Monitoring

```bash
# View ECS service metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=what-if-generator-prod-api-gateway \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# View application logs
aws logs tail /aws/ecs/what-if-generator-prod --follow
```

### 5.3 Database Monitoring

```bash
# RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=what-if-generator-prod-postgres \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=what-if-generator-prod-scenarios \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## 🔒 Step 6: Security Configuration

### 6.1 Setup AWS Secrets Manager

```bash
# JWT Secret
aws secretsmanager create-secret \
  --name "what-if-generator-prod/jwt" \
  --description "JWT secret for authentication" \
  --secret-string '{"secret":"your-super-secret-jwt-key-production-change-this"}'

# Database Credentials
aws secretsmanager create-secret \
  --name "what-if-generator-prod/database" \
  --description "Database credentials" \
  --secret-string '{"username":"postgres","password":"ProductionPassword123!","host":"what-if-generator-prod-postgres.xyz.us-east-1.rds.amazonaws.com","port":"5432"}'

# Redis URL
aws secretsmanager create-secret \
  --name "what-if-generator-prod/redis" \
  --description "Redis connection URL" \
  --secret-string '{"url":"redis://what-if-generator-prod-redis.xyz.cache.amazonaws.com:6379"}'

# Gemini API Key
aws secretsmanager create-secret \
  --name "what-if-generator-prod/gemini" \
  --description "Gemini AI API key" \
  --secret-string '{"api_key":"your-real-gemini-api-key"}'
```

### 6.2 IAM Roles and Policies

```bash
# Verify ECS task role permissions
aws iam get-role --role-name what-if-generator-prod-ECSTaskRole

# Verify ECS execution role permissions
aws iam get-role --role-name what-if-generator-prod-ECSTaskExecutionRole
```

### 6.3 Network Security

```bash
# Verify Security Groups
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=what-if-generator-prod-*"

# Check VPC configuration
aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=what-if-generator-prod-vpc"
```

## 🔄 Step 7: Backup và Disaster Recovery

### 7.1 Database Backups

```bash
# Manual RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier what-if-generator-prod-postgres \
  --db-snapshot-identifier what-if-generator-prod-manual-$(date +%Y%m%d%H%M%S)

# List existing snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier what-if-generator-prod-postgres
```

### 7.2 DynamoDB Backups

```bash
# Create on-demand backup
aws dynamodb create-backup \
  --table-name what-if-generator-prod-scenarios \
  --backup-name scenarios-backup-$(date +%Y%m%d%H%M%S)

# List backups
aws dynamodb list-backups \
  --table-name what-if-generator-prod-scenarios
```

### 7.3 S3 Backup

```bash
# Enable versioning (already configured in template)
aws s3api put-bucket-versioning \
  --bucket what-if-generator-prod-static-assets \
  --versioning-configuration Status=Enabled

# Cross-region replication (optional)
aws s3api put-bucket-replication \
  --bucket what-if-generator-prod-static-assets \
  --replication-configuration file://replication-config.json
```

## 🚨 Step 8: Troubleshooting

### 8.1 Common Issues

#### ECS Service Won't Start
```bash
# Check service events
aws ecs describe-services \
  --cluster what-if-generator-prod-cluster \
  --services what-if-generator-prod-api-gateway

# Check task logs
aws logs tail /aws/ecs/what-if-generator-prod --follow
```

#### Database Connection Issues
```bash
# Test database connection from ECS task
aws ecs execute-command \
  --cluster what-if-generator-prod-cluster \
  --task task-id \
  --container api-gateway \
  --interactive \
  --command "/bin/bash"

# Inside container:
pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER
```

#### Load Balancer Health Check Failures
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:account:targetgroup/what-if-generator-prod-api-tg/xyz

# Check ALB logs
aws logs tail /aws/applicationloadbalancer/app/what-if-generator-prod-alb --follow
```

### 8.2 Debug Commands

```bash
# Check pipeline status
aws codepipeline get-pipeline-state --name what-if-generator-prod

# Check build logs
aws codebuild batch-get-builds --ids build-id

# Check deployment status
aws codedeploy get-deployment --deployment-id deployment-id

# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name what-if-generator-prod
```

## 📈 Step 9: Performance Optimization

### 9.1 Auto Scaling Configuration

```bash
# Check auto scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/what-if-generator-prod-cluster/what-if-generator-prod-api-gateway

# Manually trigger scaling (for testing)
aws application-autoscaling put-scaling-policy \
  --policy-name what-if-generator-prod-api-gateway-scaling \
  --service-namespace ecs \
  --resource-id service/what-if-generator-prod-cluster/what-if-generator-prod-api-gateway \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### 9.2 CloudFront Optimization

```bash
# Check CloudFront cache statistics
aws cloudfront get-distribution-config --id DISTRIBUTION_ID

# Invalidate CloudFront cache (if needed)
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

### 9.3 Database Performance

```bash
# Check RDS performance insights
aws rds describe-db-instances \
  --db-instance-identifier what-if-generator-prod-postgres

# DynamoDB performance monitoring
aws dynamodb describe-table \
  --table-name what-if-generator-prod-scenarios
```

## 💰 Step 10: Cost Optimization

### 10.1 Monitor Costs

```bash
# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Set up billing alerts
aws cloudwatch put-metric-alarm \
  --alarm-name "High-Billing-Alert" \
  --alarm-description "Alert when billing exceeds threshold" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:account:billing-alerts
```

### 10.2 Resource Optimization

```bash
# Check unused resources
aws ec2 describe-volumes --filters "Name=status,Values=available"
aws rds describe-db-snapshots --max-items 100
aws s3api list-buckets

# Optimize ECS task sizes
aws ecs describe-task-definition \
  --task-definition what-if-generator-prod-api-gateway:latest
```

## 🎯 Step 11: Production Readiness Checklist

### Infrastructure ✅
- [ ] VPC với Multi-AZ subnets
- [ ] Security Groups với least privilege
- [ ] ALB với health checks
- [ ] ECS Fargate với auto-scaling
- [ ] RDS Multi-AZ với backup
- [ ] ElastiCache Redis cluster
- [ ] DynamoDB với Point-in-Time Recovery
- [ ] CloudFront với WAF
- [ ] S3 với encryption và lifecycle

### Security ✅
- [ ] Secrets Manager cho sensitive data
- [ ] IAM roles với minimal permissions
- [ ] WAF rules configured
- [ ] SSL certificates
- [ ] VPC endpoints cho AWS services
- [ ] Security groups properly configured
- [ ] Database encryption enabled
- [ ] S3 bucket policies restrictive

### Monitoring ✅
- [ ] CloudWatch alarms configured
- [ ] Application logs centralized
- [ ] Performance metrics tracked
- [ ] Cost monitoring enabled
- [ ] SNS notifications setup
- [ ] Health checks functioning
- [ ] X-Ray tracing enabled (optional)

### CI/CD ✅
- [ ] Pipelines cho dev/test/prod
- [ ] Automated testing
- [ ] Manual approval cho production
- [ ] Rollback strategies
- [ ] Blue-green deployments (production)
- [ ] ECR image scanning
- [ ] Build artifact retention

### Backup & Recovery ✅
- [ ] RDS automated backups
- [ ] DynamoDB backups
- [ ] S3 versioning enabled
- [ ] Cross-region replication (critical data)
- [ ] Disaster recovery procedures documented
- [ ] Recovery testing performed

## 🌟 Success Metrics

Sau khi hoàn thành deployment:

### Development Environment
- ✅ Code push tự động trigger pipeline
- ✅ Tests pass và images được build
- ✅ Auto deploy thành công
- ✅ Health checks pass
- ✅ Application accessible

### Test Environment  
- ✅ Merge từ develop trigger pipeline
- ✅ Full test suite pass
- ✅ Performance tests pass
- ✅ Security scans pass
- ✅ Manual testing ready

### Production Environment
- ✅ Manual approval workflow functioning
- ✅ Blue-green deployment successful
- ✅ Zero-downtime deployment
- ✅ All monitoring alerts working
- ✅ Performance meets SLA
- ✅ Security compliance verified

## 📞 Support và Maintenance

### Regular Tasks
- **Daily**: Monitor health checks và performance
- **Weekly**: Review costs và optimize resources
- **Monthly**: Update dependencies và security patches
- **Quarterly**: Review backup và disaster recovery procedures
- **Annually**: Security audit và compliance review

### Emergency Contacts
- **Infrastructure Issues**: DevOps team
- **Application Issues**: Development team  
- **Security Incidents**: Security team
- **AWS Support**: Business/Enterprise support case

### Documentation
- **Architecture**: `/docs/ARCHITECTURE.md`
- **API Documentation**: `https://your-domain.com/api-docs`
- **Monitoring**: CloudWatch dashboards
- **Troubleshooting**: This guide

---

## 🎉 Kết Luận

Bạn đã hoàn thành việc setup một production-ready infrastructure với:

- **🏗️ High Availability**: Multi-AZ deployment
- **🔒 Security**: WAF, secrets management, encryption
- **📊 Observability**: Comprehensive monitoring và logging
- **🚀 CI/CD**: Automated pipelines với manual approval
- **💰 Cost Optimization**: Auto-scaling và resource efficiency
- **🔄 Disaster Recovery**: Backup strategies và rollback capabilities

**What If Generator** giờ đã sẵn sàng scale và serve production traffic! 🚀