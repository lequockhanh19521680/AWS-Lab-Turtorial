# Quick Deployment Reference

> Tài liệu tham khảo nhanh cho deployment. Xem DEPLOYMENT_GUIDE.md cho hướng dẫn chi tiết.

## Quick Commands

### Local Development
```bash
# Setup and run locally
./scripts/setup-local.sh
docker-compose up -d
open http://localhost:3007
```

### AWS Deployment
```bash
# Deploy CI/CD Pipeline
aws cloudformation deploy \
  --template-file aws/cicd-pipeline.yaml \
  --stack-name what-if-generator-pipeline \
  --capabilities CAPABILITY_IAM

# Deploy Infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-prod \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM
```

## Architecture

### Well-Architected Framework Compliance

- **Security**: VPC with private subnets, security groups, encrypted databases
- **Reliability**: Multi-AZ deployment, auto-scaling, health checks
- **Performance**: CloudFront CDN, Redis caching, load balancing
- **Cost Optimization**: Fargate Spot instances, appropriate instance sizes
- **Operational Excellence**: CloudWatch logging, monitoring, automated deployments
- **Sustainability**: Efficient resource utilization, auto-scaling

### Infrastructure Components

- **VPC**: 3-tier architecture (Public, Private, Database)
- **ECS Fargate**: Container orchestration
- **Application Load Balancer**: Traffic distribution
- **RDS PostgreSQL**: User data storage
- **DocumentDB**: Scenario and sharing data
- **ElastiCache Redis**: Caching and sessions
- **CloudFront**: CDN for static assets
- **S3**: Static file storage

## Prerequisites

### Required Tools
- AWS CLI configured with appropriate permissions
- Docker installed and running
- Node.js 18+ installed
- CDK CLI (for CDK deployment)

### AWS Permissions
Your AWS user/role needs permissions for:
- ECS, ECR, VPC, RDS, ElastiCache, DocumentDB
- CloudFormation, IAM, CloudWatch
- S3, CloudFront, Route53 (if using custom domain)

## Environment Configuration

### Environment Files
- `.env` - Global defaults
- `.env.development` - Development overrides
- `.env.test` - Test environment
- `.env.production` - Production settings

### Required Environment Variables
```bash
# Database
POSTGRES_DB=what_if_users
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
MONGODB_URI=mongodb://admin:password@host:27017
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AI Provider
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
```

## Deployment Methods

### 1. CloudFormation (Recommended for Production)

```bash
# Deploy infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1

# Deploy CI/CD pipeline
aws cloudformation deploy \
  --template-file aws/codepipeline.yaml \
  --stack-name what-if-generator-pipeline \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### 2. CDK (Recommended for Development)

```bash
# Install dependencies
cd aws/cdk
npm install

# Deploy development environment
npm run deploy:dev

# Deploy test environment
npm run deploy:test

# Deploy production environment
npm run deploy:prod
```

### 3. Automated Script

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to development
./scripts/deploy.sh development

# Deploy to test
./scripts/deploy.sh test

# Deploy to production
./scripts/deploy.sh production
```

## CI/CD Pipeline

### Pipeline Stages
1. **Source**: GitHub webhook triggers pipeline
2. **Test**: Unit tests and linting
3. **Build**: Docker image building and ECR push
4. **Deploy Dev**: Automatic deployment to development
5. **Deploy Test**: Automatic deployment to test
6. **Manual Approval**: Required for production
7. **Deploy Prod**: Production deployment after approval

### Pipeline Configuration
- **CodeBuild**: Build and test services
- **CodeDeploy**: ECS service updates
- **CodePipeline**: Orchestrates the entire flow

## Environment-Specific Configurations

### Development
- Single AZ deployment
- Smaller instance sizes
- Debug logging enabled
- No encryption for easier debugging

### Test
- Multi-AZ deployment
- Production-like instance sizes
- Stricter security settings
- Automated testing

### Production
- Multi-AZ deployment
- Auto-scaling enabled
- Full encryption
- Monitoring and alerting
- Backup and disaster recovery

## Monitoring and Logging

### CloudWatch
- Application logs: `/aws/ecs/what-if-generator`
- Custom metrics for business logic
- Alarms for critical thresholds

### Health Checks
- Application Load Balancer health checks
- ECS service health checks
- Custom application health endpoints

### Monitoring Stack
- CloudWatch Dashboards
- CloudWatch Alarms
- SNS notifications
- X-Ray tracing (optional)

## Security Best Practices

### Network Security
- VPC with private subnets
- Security groups with least privilege
- NAT gateways for outbound traffic
- No direct internet access to databases

### Data Security
- Encryption at rest for all databases
- Encryption in transit for all communications
- Secrets Manager for sensitive data
- IAM roles with minimal permissions

### Application Security
- JWT authentication
- Rate limiting
- Input validation
- CORS configuration
- Security headers (Helmet)

## Scaling and Performance

### Auto Scaling
- ECS service auto-scaling based on CPU/memory
- Database read replicas for read-heavy workloads
- Redis cluster for caching

### Performance Optimization
- CloudFront CDN for static assets
- Redis caching for frequently accessed data
- Database connection pooling
- Efficient container resource allocation

## Backup and Disaster Recovery

### Database Backups
- RDS automated backups (7 days retention)
- DocumentDB automated backups
- Cross-region backup replication (optional)

### Application Backups
- ECR image versioning
- Infrastructure as Code (CloudFormation/CDK)
- Configuration management

## Troubleshooting

### Common Issues
1. **Service won't start**: Check CloudWatch logs
2. **Database connection failed**: Verify security groups
3. **Load balancer health checks failing**: Check application health endpoint
4. **Out of memory**: Increase task memory allocation

### Debugging Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster what-if-generator-cluster --services api-service

# View CloudWatch logs
aws logs tail /aws/ecs/what-if-generator --follow

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## Cost Optimization

### Development
- Use Fargate Spot instances
- Single AZ deployment
- Smaller instance sizes
- Scheduled scaling (stop at night)

### Production
- Reserved instances for predictable workloads
- Auto-scaling to handle traffic spikes
- CloudFront for global content delivery
- S3 lifecycle policies for old data

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate secrets quarterly
- Monitor costs and optimize resources
- Update security patches

### Monitoring
- Set up billing alerts
- Monitor application performance
- Review security logs
- Check backup status

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review this documentation
3. Check AWS service health
4. Contact the development team