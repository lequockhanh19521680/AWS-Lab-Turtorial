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

| Environment | PostgreSQL | DynamoDB | Redis |
|-------------|------------|----------|-------|
| **Development** | Local Docker | Local DynamoDB | Local Redis |
| **Test** | AWS RDS | AWS DynamoDB | AWS ElastiCache |
| **Production** | AWS RDS | AWS DynamoDB | AWS ElastiCache |

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

### Infrastructure as Code
```bash
# Deploy infrastructure
aws cloudformation deploy \
  --template-file aws/infrastructure.yaml \
  --stack-name what-if-generator-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_IAM

# Deploy with CDK
cd aws/cdk
npm run deploy:prod
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
├── aws/                  # AWS CloudFormation/CDK
│   ├── infrastructure.yaml # Infrastructure template
│   ├── cicd-pipeline.yaml  # CI/CD pipeline
│   └── cdk/              # CDK infrastructure
├── scripts/              # Utility scripts
├── docker/               # Database init scripts
├── k8s/                  # Kubernetes configs
└── docs/                 # Documentation
```

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