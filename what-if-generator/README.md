# What If Generator

> AI-powered scenario generation platform với kiến trúc microservices được tối ưu cho AWS

## 🎯 Giải Quyết Vấn Đề

What If Generator là một nền tảng AI cho phép người dùng tạo ra các viễn cảnh "Nếu như..." một cách sáng tạo và thú vị. Hệ thống giải quyết các vấn đề:

- **Sáng tạo nội dung**: Giúp người dùng tạo ra các scenario thú vị từ ý tưởng đơn giản
- **Chia sẻ xã hội**: Cho phép chia sẻ và tương tác với cộng đồng
- **Lưu trữ lịch sử**: Theo dõi và quản lý các scenario đã tạo
- **Tạo video**: Chuyển đổi scenario thành video động

## 🏗️ Kiến Trúc Hệ Thống

### Microservices Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Load Balancer │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (ALB)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │ User Service │ │Generation │ │History Svc  │
        │ (PostgreSQL) │ │ Service   │ │ (DynamoDB)  │
        └──────────────┘ └───────────┘ └─────────────┘
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │ Sharing Svc  │ │ Video Svc │ │ Social Svc  │
        │ (DynamoDB)   │ │ (Redis)   │ │ (DynamoDB)  │
        └──────────────┘ └───────────┘ └─────────────┘
```

### Database Strategy

| Environment | PostgreSQL | DynamoDB | Redis |
|-------------|------------|----------|-------|
| **Development** | Local Docker | Local DynamoDB | Local Redis |
| **Test** | AWS RDS | AWS DynamoDB | AWS ElastiCache |
| **Production** | AWS RDS | AWS DynamoDB | AWS ElastiCache |

### AWS Services Integration

- **Compute**: ECS Fargate với Auto Scaling
- **Database**: RDS PostgreSQL, DynamoDB, ElastiCache Redis
- **Storage**: S3 cho static assets
- **CDN**: CloudFront distribution
- **Monitoring**: CloudWatch, X-Ray tracing, CloudTrail audit
- **Security**: Secrets Manager, IAM roles
- **Networking**: VPC, ALB, NAT Gateways

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (latest version)
- **Node.js 18+** and npm
- **Git** for version control

### Automated Development Setup

```bash
# Clone repository
git clone <repository-url>
cd what-if-generator

# Run automated setup script
./scripts/setup-local.sh
```

The setup script will:
1. ✅ Check prerequisites
2. 🔧 Create environment configuration
3. 📁 Create necessary directories  
4. 📦 Install all dependencies
5. 🐳 Start Docker services
6. 🗄️ Setup DynamoDB tables
7. 🏥 Verify service health

### Manual Development Setup

```bash
# 1. Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 2. Start infrastructure services first
docker-compose up -d postgres dynamodb redis

# 3. Start application services
docker-compose up -d

# 4. Setup DynamoDB tables
node scripts/setup-dynamodb-tables.js development

# 5. Access application
open http://localhost:3007  # Frontend (FIXED PORT)
open http://localhost:3000  # API Gateway
```

### Production Deployment

```bash
# Deploy AWS infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM

# Run database migration
node scripts/migrate-to-aws.js production

# Deploy application
./scripts/deploy.sh production
```

## 📋 Prerequisites

### Development
- Docker & Docker Compose
- Node.js 18+
- AWS CLI (for testing)

### Production
- AWS Account với appropriate permissions
- Domain name và SSL certificate
- API keys cho AI providers

## 🔧 Environment Configuration

### Configuration Files (UPDATED)

The project now uses a proper environment configuration system:

- **`.env.example`** - Template with all available settings
- **`.env.development`** - Development environment settings
- **`.env.test`** - Test environment settings  
- **`.env.production`** - Production environment settings
- **`.env.local`** - Local overrides (gitignored)

### Service Ports (FIXED ARCHITECTURE)

**⚠️ IMPORTANT: Ports are now fixed and should NOT be changed**

- **API Gateway**: `3000` (External entry point)
- **User Service**: `3001` 
- **Generation Service**: `3002`
- **History Service**: `3003`
- **Sharing Service**: `3004`
- **Video Service**: `3005`
- **Social Service**: `3006`
- **Frontend**: `3007` (Development only)

### Key Configuration Changes

1. **Frontend Port**: Changed from `3005` to `3007` (conflict resolved)
2. **Load Balancer**: Now correctly routes ALL traffic through API Gateway
3. **Environment Files**: Proper .env file hierarchy
4. **Security**: JWT secrets and API keys properly managed
5. **Database**: Complete migration from MongoDB to DynamoDB

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Start with legacy MongoDB (for migration)
docker-compose --profile legacy up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

## 🗄️ Database Migration

### From MongoDB to DynamoDB

```bash
# Setup DynamoDB tables
node scripts/setup-dynamodb-tables.js [environment]

# Migrate data
node scripts/migrate-to-aws.js [environment] --backup

# Verify migration
node scripts/verify-migration.js [environment]
```

### Database Schema

#### PostgreSQL (User Service)
- `users` - User accounts và authentication
- `user_roles` - Role-based access control
- `user_sessions` - Active sessions
- `user_statistics` - User analytics

#### DynamoDB (Other Services)
- `scenarios` - Generated scenarios
- `shared_scenarios` - Shared content
- `reports` - Content moderation
- `achievements` - Gamification system
- `posts` & `comments` - Social features

## 📊 Monitoring & Observability

### CloudWatch Integration
- Application logs
- Custom metrics
- Performance monitoring
- Alerting

### X-Ray Tracing
- Request tracing across services
- Performance bottleneck identification
- Error tracking

### CloudTrail Audit
- API call logging
- Security auditing
- Compliance tracking

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Test specific service
cd services/user-service && npm test
```

## 🔒 Security

- JWT authentication với refresh tokens
- Rate limiting per user/IP
- CORS protection
- Helmet security headers
- Input validation và sanitization
- AWS Secrets Manager cho sensitive data
- VPC isolation cho production

## 📚 API Documentation

- **Swagger UI**: http://localhost:3000/api-docs (development)
- **Health Check**: http://localhost:3000/health
- **OpenAPI Spec**: `/docs/api-spec.yaml`

## 🚀 Deployment

### AWS Infrastructure

```bash
# Deploy infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-[environment] \
  --parameter-overrides Environment=[environment] \
  --capabilities CAPABILITY_IAM
```

### Application Deployment

```bash
# Build and push Docker images
./scripts/build-images.sh

# Deploy to ECS
./scripts/deploy-ecs.sh [environment]

# Update service
aws ecs update-service \
  --cluster what-if-generator-cluster \
  --service api-service \
  --force-new-deployment
```

## 📈 Performance Optimization

- **Database**: Connection pooling, query optimization
- **Caching**: Redis cho session và API responses
- **CDN**: CloudFront cho static assets
- **Auto Scaling**: ECS services scale based on CPU/Memory
- **Load Balancing**: ALB với health checks

## 🔧 Development Guidelines

### Code Standards
- ESLint configuration cho consistent code style
- Prettier cho code formatting
- Husky pre-commit hooks
- Conventional commits

### Testing Strategy
- Unit tests cho business logic
- Integration tests cho API endpoints
- E2E tests cho critical user flows
- Load testing cho performance validation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Documentation**: `/docs/` directory
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@whatifgenerator.com

---

**What If Generator** - Khám phá vô vàn khả năng với AI! 🚀