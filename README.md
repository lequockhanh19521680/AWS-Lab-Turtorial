# What If Generator 🚀

> Nền tảng AI tạo viễn cảnh với kiến trúc microservices tối ưu cho AWS

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Ready-orange.svg)](https://aws.amazon.com/)

## 🎯 Tổng Quan

What If Generator là nền tảng AI cho phép tạo ra các viễn cảnh "Nếu như..." sáng tạo. Được xây dựng với kiến trúc microservices hiện đại, tối ưu cho triển khai AWS với CI/CD hoàn chỉnh.

### ✨ Tính Năng Chính

- **🤖 AI Generation**: Tạo scenarios với Google Gemini
- **🎬 Video Creation**: Chuyển đổi thành video động
- **🗣️ Text-to-Speech**: Audio narration chuyên nghiệp
- **🤝 Social Features**: Chia sẻ và tương tác cộng đồng
- **📊 Analytics**: Theo dõi và phân tích hiệu suất
- **🏆 Gamification**: Hệ thống thành tích và điểm số

## 🏗️ Kiến Trúc Hệ Thống

### Production Architecture (AWS)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   CloudFront    │    │       ALB       │
│   (Next.js)     │◄──►│      CDN        │◄──►│  Load Balancer  │
│   S3 + CF       │    │   Static Assets │    │  (Port 80/443)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   API Gateway   │
                                              │   (Port 3000)   │
                                              │  Authentication │
                                              │  Rate Limiting  │
                                              └─────────────────┘
                                                       │
                               ┌───────────────────────┼───────────────────────┐
                               │                       │                       │
                      ┌────────▼──────┐       ┌───────▼─────┐        ┌────────▼──────┐
                      │ User Service  │       │Generation   │        │History Service│
                      │  (ECS/RDS)    │       │Service      │        │  (ECS/DDB)    │
                      │  Auth & Users │       │(ECS/Cache)  │        │   Scenarios   │
                      └───────────────┘       └─────────────┘        └───────────────┘
                               │                       │                       │
                      ┌────────▼──────┐       ┌───────▼─────┐        ┌────────▼──────┐
                      │Sharing Service│       │Video Service│        │Social Service │
                      │  (ECS/DDB)    │       │(ECS/S3)     │        │  (ECS/DDB)    │
                      │   Sharing     │       │TTS & Video  │        │Social Features│
                      └───────────────┘       └─────────────┘        └───────────────┘
```

### Service Ports

- **API Gateway**: `3000` (Entry point)
- **User Service**: `3001`
- **Generation Service**: `3002`
- **History Service**: `3003`
- **Sharing Service**: `3004`
- **Video Service**: `3005`
- **Social Service**: `3006`
- **Frontend**: `3007` (Dev only)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- AWS CLI (cho production)

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd what-if-generator

# Automated setup
./scripts/setup-local.sh

# Manual setup
cp .env.example .env.local
# Cập nhật .env.local với API keys
docker-compose up -d

# Access application
open http://localhost:3007  # Frontend
open http://localhost:3000  # API Gateway
```

## 🗄️ Database Strategy

| Environment     | PostgreSQL   | DynamoDB       | Redis           |
| --------------- | ------------ | -------------- | --------------- |
| **Development** | Local Docker | Local DynamoDB | Local Redis     |
| **Test**        | AWS RDS      | AWS DynamoDB   | AWS ElastiCache |
| **Production**  | AWS RDS      | AWS DynamoDB   | AWS ElastiCache |

### Database Schema

- **PostgreSQL**: Users, authentication, social data
- **DynamoDB**: Scenarios, sharing, achievements
- **Redis**: Caching, sessions

## 🔧 Environment Configuration

```bash
# Service Ports
API_GATEWAY_PORT=3000
FRONTEND_PORT=3007

# Database
POSTGRES_DB=what_if_users
REDIS_URL=redis://localhost:6379
DYNAMODB_ENDPOINT=http://localhost:8000

# AI Providers
GEMINI_API_KEY=your-gemini-api-key
AI_PROVIDER=gemini

# Security
JWT_SECRET=your-strong-jwt-secret
CORS_ORIGIN=http://localhost:3007
```

## 📚 API Documentation

### Key Endpoints

```bash
# Authentication
POST /api/auth/login
POST /api/auth/register

# Generation
POST /api/generate
GET /api/scenarios/my

# Sharing
POST /api/share
GET /api/shared/:shareUrl

# Video Generation
POST /api/video/generate
POST /api/tts/generate

# Social Features
POST /api/social/posts
GET /api/social/posts/feed
GET /api/achievements
```

## 🚀 AWS Deployment

### 💰 Free Tier Deployment (Under $50/month)

```bash
# Deploy optimized infrastructure for free tier
aws cloudformation deploy \
  --template-file aws/infrastructure-free-tier.yaml \
  --stack-name what-if-generator-freetier \
  --parameter-overrides Environment=development \
  --capabilities CAPABILITY_IAM

# See docs/FREE_TIER_DEPLOYMENT.md for complete guide
```

### 🏭 Production Infrastructure

```bash
# Deploy full production infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM
```

### CI/CD Pipeline

```bash
# Deploy pipeline
aws cloudformation deploy \
  --template-file aws/cicd-pipeline.yaml \
  --stack-name what-if-generator-pipeline \
  --capabilities CAPABILITY_IAM
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Health checks
curl http://localhost:3000/health

# Rebuild and start
docker-compose up --build -d
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Full flow test
node test-story-hub-flow.js
```

## 📊 Monitoring & Observability

### CloudWatch Integration

- Application logs: `/aws/ecs/what-if-generator`
- Custom metrics cho business logic
- Alarms cho critical thresholds
- X-Ray tracing cho performance

### Health Checks

- Service health: Individual endpoints
- Overall health: API Gateway unified endpoint
- Database health: PostgreSQL, DynamoDB, Redis connectivity

## 🔒 Security Features

### Authentication & Authorization

- JWT stateless authentication
- Role-Based Access Control (RBAC)
- Redis-backed sessions
- Security headers (Helmet.js)

### Network Security

- VPC isolation với private subnets
- Security groups với least privilege
- SSL/TLS end-to-end encryption
- Rate limiting per-user và per-IP

## 🛠️ Troubleshooting

### Common Issues

```bash
# Port conflicts
lsof -i :3000,3001,3002,3003,3004,3005,3006,3007

# Database connection
docker-compose logs postgres dynamodb redis

# Service health
curl http://localhost:3000/health
```

## 📋 Project Structure

```
what-if-generator/
├── api-gateway/          # API Gateway service
├── services/             # Microservices
│   ├── user-service/     # User authentication
│   ├── generation-service/ # AI scenario generation
│   ├── history-service/  # Scenario history
│   ├── sharing-service/  # Content sharing
│   ├── video-service/    # Video generation
│   └── social-service/   # Social features
├── frontend/             # Next.js frontend
├── aws/                  # AWS Infrastructure
│   ├── infrastructure-free-tier.yaml # Free tier optimized (<$50/month)
│   ├── infrastructure.yaml           # Full production setup
│   └── cicd-pipeline.yaml           # CI/CD pipeline
├── scripts/              # Utility scripts
├── docker/               # Database init scripts
└── docs/                 # Essential Documentation
    ├── ARCHITECTURE.md           # System architecture
    ├── API.md                   # API documentation
    ├── AWS_OBSERVABILITY.md     # Monitoring guide
    └── FREE_TIER_DEPLOYMENT.md  # Cost-optimized deployment
```

## 💰 Cost Optimization

### Free Tier Setup (Under $50/month)

- **Target Cost**: $35-45 USD/month
- **Key Savings**: Single AZ, minimal resources, Fargate Spot
- **Services**: ECS Fargate, RDS t3.micro, DynamoDB, S3
- **Guide**: See `docs/FREE_TIER_DEPLOYMENT.md`

### Production Setup

- **High Availability**: Multi-AZ deployment
- **Auto Scaling**: Based on demand
- **Cost**: $200-500 USD/month depending on usage
- **Enterprise Features**: Full monitoring, backups, security

## 🎉 Recent Improvements

### Architecture Fixes ✅

- Fixed load balancer routing (ALB → API Gateway)
- Corrected port conflicts (Frontend: 3005 → 3007)
- Proper service isolation
- Single entry point pattern

### Security Enhancements ✅

- Environment variable system
- AWS Secrets Manager integration
- Security headers implementation
- CORS configuration

### DevOps Ready ✅

- Complete CI/CD pipeline
- Infrastructure as Code
- Multi-environment support
- Automated deployments

### Database Migration ✅

- MongoDB → DynamoDB completed
- Environment-specific configs
- Health verification tools
- Backup strategies

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🆘 Support

- **Documentation**: `/docs/` directory
- **Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api-docs

---

**What If Generator** - Khám phá vô vàn khả năng với AI! 🚀

# What If Generator - Super Easy Deployment Guide

Hướng dẫn deploy dự án "Cỗ Máy Nếu Như" với chỉ vài câu lệnh đơn giản.

## 🚀 Quick Start - Deploy trong 3 bước

### 1. Cài đặt môi trường

```bash
# Clone project và vào thư mục
git clone [your-repo-url]
cd what-if-generator

# Cài đặt dependencies
npm run install:all
```

### 2. Chọn environment và deploy

```bash
# Development (local)
npm run deploy:dev

# Free Tier (AWS - Under $50/month) 💰
aws cloudformation deploy \
  --template-file aws/infrastructure-free-tier.yaml \
  --stack-name what-if-generator-freetier \
  --parameter-overrides Environment=development \
  --capabilities CAPABILITY_IAM

# Test environment (AWS)
npm run deploy:test

# Production (AWS)
npm run deploy:prod
```

### 3. Thành công! 🎉

- **Dev**: http://localhost:8080
- **Test/Prod**: URLs sẽ hiển thị sau khi deploy xong

## 📋 Yêu cầu hệ thống

Đảm bảo các tools sau đã được cài đặt:

- **Node.js** >= 18.0.0
- **Docker** và Docker Compose
- **AWS CLI** (cho test/prod)
- **kubectl** (optional, cho K8s)
- **Git**

## 🌍 Environments

### Development (Local)

- **Frontend**: Port 8080
- **Backend**: Port 3000
- **Database**: Local PostgreSQL hoặc Docker
- **Auto-seed**: Tự động tạo dữ liệu mẫu

### 💰 Free Tier (AWS - Under $50/month)

- **Cost**: $35-45 USD/month
- **RDS**: PostgreSQL t3.micro (single AZ)
- **DynamoDB**: Provisioned capacity (5 RCU/WCU)
- **ECS**: Single Fargate Spot instance (256 CPU, 512MB)
- **S3**: Static assets (5GB limit)
- **Guide**: See `docs/FREE_TIER_DEPLOYMENT.md`

### Test Environment (AWS)

- **RDS**: PostgreSQL riêng cho test
- **DynamoDB**: Shared với production
- **ECS**: Fargate containers
- **CloudFront**: CDN cho frontend

### Production (AWS)

- **RDS**: PostgreSQL riêng cho production
- **DynamoDB**: Shared với test
- **ECS**: Fargate containers với auto-scaling
- **CloudFront**: CDN với SSL certificate

## 🔧 Cấu hình nâng cao

### Environment Variables

Các file môi trường đã được chuẩn bị:

- `.env.dev` - Development
- `.env.test` - Test
- `.env.prod` - Production

### AWS Secrets Manager

Tất cả secrets được lưu trữ an toàn trên AWS:

- Database credentials
- JWT secrets
- API keys
- Email configuration

### Database Configuration

- **Dev**: RDS riêng + DynamoDB riêng
- **Test**: RDS riêng + DynamoDB shared
- **Prod**: RDS riêng + DynamoDB shared

## 📱 Deployment Commands

### Cơ bản

```bash
# Deploy development
./quick-deploy.sh dev

# Deploy test
./quick-deploy.sh test

# Deploy production (có xác nhận)
./quick-deploy.sh prod
```

### Nâng cao

```bash
# Deploy với options
./deploy.sh dev --skip-tests
./deploy.sh prod --force-build

# Build manual
npm run build
npm run build:docker

# Test trước khi deploy
npm run test
npm run lint
npm run type-check
```

### Các scripts khác

```bash
# Chạy local development
npm run dev

# Seed database
npm run seed

# Docker operations
npm run start:docker
npm run stop:docker

# Kubernetes (optional)
npm run deploy:k8s
npm run undeploy:k8s
```

## 🔍 Monitoring và Logs

### Development

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs một service cụ thể
docker-compose logs -f user-service
docker-compose logs -f frontend

# Status của services
docker-compose ps
```

### Production (AWS)

```bash
# CloudWatch logs
aws logs tail /aws/ecs/what-if-generator-prod --follow

# ECS service status
aws ecs describe-services --cluster what-if-generator-prod --services api-gateway-service

# Health checks
curl https://your-domain.com/health
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Docker không start được

```bash
# Restart Docker service
sudo systemctl restart docker

# Clear Docker cache
docker system prune -a
```

#### 2. AWS credentials

```bash
# Configure AWS
aws configure

# Check credentials
aws sts get-caller-identity
```

#### 3. Port conflicts

```bash
# Kill processes using ports
sudo lsof -ti:8080 | xargs kill -9
sudo lsof -ti:3000 | xargs kill -9
```

#### 4. Database connection issues

```bash
# Check environment file
cat .env

# Test database connection
docker-compose exec user-service npm run test:db
```

### Logs Locations

- **Development**: `docker-compose logs`
- **Test/Prod**: CloudWatch Logs
- **Build logs**: GitHub Actions (nếu có CI/CD)

## 🔄 CI/CD Pipeline

### GitHub Actions (Recommended)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, develop]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Test
        if: github.ref == 'refs/heads/develop'
        run: ./deploy.sh test
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: ./deploy.sh prod
```

### AWS CodePipeline

- Tự động build và deploy khi push code
- Blue/Green deployment cho production
- Automatic rollback nếu có lỗi

## 📊 Performance Optimization

### Frontend

- **Next.js**: Static generation + SSR
- **CDN**: CloudFront caching
- **Image optimization**: Automatic WebP conversion
- **Bundle splitting**: Code splitting tự động

### Backend

- **Caching**: Redis cho session và data
- **Database**: Connection pooling
- **Auto-scaling**: ECS Fargate auto-scaling
- **Load balancing**: Application Load Balancer

## 🔒 Security

### Best Practices Implemented

- **HTTPS**: SSL certificates tự động
- **Secrets**: AWS Secrets Manager
- **Rate limiting**: API rate limiting
- **CORS**: Configured properly
- **Helmet**: Security headers
- **JWT**: Secure authentication
- **SQL Injection**: Parameterized queries
- **XSS**: Input sanitization

## 📈 Scaling

### Automatic Scaling

- **ECS**: Auto-scaling based on CPU/Memory
- **RDS**: Auto-scaling storage
- **DynamoDB**: On-demand scaling
- **CloudFront**: Global CDN

### Manual Scaling

```bash
# Scale ECS service
aws ecs update-service --cluster production --service api-gateway --desired-count 5

# Scale RDS
aws rds modify-db-instance --db-instance-identifier prod-db --db-instance-class db.r5.xlarge
```

## 💰 Cost Optimization

### 🆓 Free Tier Strategy (Under $50/month)

- **Infrastructure**: `aws/infrastructure-free-tier.yaml`
- **Target Cost**: $35-45 USD/month
- **Key Savings**:
  - Single AZ deployment (no Multi-AZ costs)
  - Fargate Spot instances (70% savings)
  - t3.micro RDS (free tier eligible)
  - Minimal resources (256 CPU, 512MB RAM)
  - Single NAT Gateway
- **Monitoring**: CloudWatch billing alerts at $40
- **Complete Guide**: `docs/FREE_TIER_DEPLOYMENT.md`

### Development

- **Fargate Spot**: 70% cost savings
- **Single NAT Gateway**: Reduced networking costs
- **t3.micro instances**: Free tier eligible

### Production

- **Reserved Instances**: Up to 72% savings
- **S3 Intelligent Tiering**: Automatic cost optimization
- **CloudWatch**: Efficient logging retention

## 🆘 Support

### Quick Help

```bash
# Show help
./deploy.sh --help
./quick-deploy.sh --help

# Check system requirements
./deploy.sh --check-requirements
```

### Community Support

- **GitHub Issues**: [Link to issues]
- **Documentation**: [Link to docs]
- **Slack/Discord**: [Link to community]

---

## 📝 Summary

Để deploy dự án chỉ cần:

1. **Development**: `npm run deploy:dev`
2. **Test**: `npm run deploy:test`
3. **Production**: `npm run deploy:prod`

Hoặc thậm chí đơn giản hơn:

```bash
./quick-deploy.sh dev    # Cho development
./quick-deploy.sh test   # Cho test
./quick-deploy.sh prod   # Cho production
```

**Thế thôi! 🎉**

Deployment giờ đây chỉ là một câu lệnh duy nhất. Tất cả phức tạp về infrastructure, database, secrets, scaling đều đã được tự động hóa.
