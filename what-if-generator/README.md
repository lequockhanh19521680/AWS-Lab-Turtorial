# What If Generator 🚀

> AI-powered scenario generation platform với kiến trúc microservices được tối ưu cho AWS

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Ready-orange.svg)](https://aws.amazon.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Tổng Quan

What If Generator là một nền tảng AI cho phép người dùng tạo ra các viễn cảnh "Nếu như..." một cách sáng tạo và thú vị. Hệ thống được xây dựng với kiến trúc microservices hiện đại, tối ưu cho việc triển khai trên AWS.

### ✨ Tính Năng Chính

- **🤖 AI Generation**: Tạo scenarios thông minh với Google Gemini
- **🎬 Video Creation**: Chuyển đổi scenarios thành video động
- **🗣️ Text-to-Speech**: Tạo audio narration chuyên nghiệp
- **🤝 Social Features**: Chia sẻ và tương tác với cộng đồng
- **📊 Analytics**: Theo dõi và phân tích hiệu suất
- **🏆 Gamification**: Hệ thống thành tích và điểm số

## 🏗️ Kiến Trúc Hệ Thống

### Corrected Architecture Diagram

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
                                              │     Routing     │
                                              └─────────────────┘
                                                       │
                               ┌───────────────────────┼───────────────────────┐
                               │                       │                       │
                      ┌────────▼──────┐       ┌───────▼─────┐        ┌────────▼──────┐
                      │ User Service  │       │Generation   │        │History Service│
                      │  (Port 3001)  │       │Service      │        │  (Port 3003)  │
                      │  PostgreSQL   │       │(Port 3002)  │        │   DynamoDB    │
                      │  Auth & Users │       │AI Providers │        │   Scenarios   │
                      └───────────────┘       └─────────────┘        └───────────────┘
                               │                       │                       │
                      ┌────────▼──────┐       ┌───────▼─────┐        ┌────────▼──────┐
                      │Sharing Service│       │Video Service│        │Social Service │
                      │  (Port 3004)  │       │(Port 3005)  │        │  (Port 3006)  │
                      │   DynamoDB    │       │    Redis    │        │   DynamoDB    │
                      │   Sharing     │       │TTS & Video  │        │Social Features│
                      └───────────────┘       └─────────────┘        └───────────────┘
                               │                       │                       │
                               └───────────────────────┼───────────────────────┘
                                                       │
                                              ┌─────────────────┐
                                              │     Redis       │
                                              │   (Port 6379)   │
                                              │ Cache & Session │
                                              └─────────────────┘
```

### Service Ports (FIXED ARCHITECTURE)

**⚠️ IMPORTANT: Ports are now fixed and should NOT be changed**

- **API Gateway**: `3000` (External entry point)
- **User Service**: `3001` 
- **Generation Service**: `3002`
- **History Service**: `3003`
- **Sharing Service**: `3004`
- **Video Service**: `3005`
- **Social Service**: `3006`
- **Frontend**: `3007` (Local development only)

### Technology Stack

#### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework với middleware
- **JWT** - Stateless authentication
- **Redis** - Session management và caching
- **PostgreSQL** - User service data (ACID compliance)
- **DynamoDB** - NoSQL for scalable content data
- **AWS SDK** - Cloud service integrations

#### Frontend  
- **Next.js** - React framework with SSR/SSG
- **React 18** - UI library with hooks
- **TypeScript** - Type safety và developer experience
- **Tailwind CSS** - Utility-first styling

#### Infrastructure
- **Docker** - Containerization
- **AWS ECS Fargate** - Serverless container orchestration
- **AWS CloudFormation** - Infrastructure as Code
- **AWS ALB** - Application Load Balancer (correctly configured)
- **AWS CloudFront** - Global CDN
- **AWS S3** - Static asset hosting

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (latest version)
- **Node.js 18+** and npm
- **Git** for version control

### Automated Setup (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd what-if-generator

# Run automated setup script
./scripts/setup-local.sh
```

Hoặc sử dụng script initialization mới:

```bash
# Initialize project for development
node scripts/init-project.js development

# Verify configuration only
node scripts/init-project.js development --verify-only
```

### Manual Setup

```bash
# 1. Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 2. Start infrastructure services first
docker-compose up -d postgres dynamodb redis

# 3. Start application services
docker-compose up -d

# 4. Initialize the project (new approach - no migrations)
node scripts/init-project.js development

# 5. Access application
open http://localhost:3007  # Frontend
open http://localhost:3000  # API Gateway
```

## 🔧 Environment Configuration

### Configuration Hierarchy

The project now uses a proper environment configuration system:

- **`.env.example`** - Template with all available settings
- **`.env.development`** - Development environment settings
- **`.env.test`** - Test environment settings  
- **`.env.production`** - Production environment settings
- **`.env.local`** - Local overrides (gitignored)

### Key Environment Variables

```bash
# Service Ports (DO NOT CHANGE)
API_GATEWAY_PORT=3000
FRONTEND_PORT=3007

# Database Configuration
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

## 🗄️ Database Strategy

### Environment-Specific Configuration

| Environment | PostgreSQL | DynamoDB | Redis |
|-------------|------------|----------|-------|
| **Development** | Local Docker | Local DynamoDB | Local Redis |
| **Test** | AWS RDS | AWS DynamoDB | AWS ElastiCache |
| **Production** | AWS RDS | AWS DynamoDB | AWS ElastiCache |

### Database Schema

#### PostgreSQL (User Service)
- `users` - User accounts và authentication
- `user_roles` - Role-based access control
- `user_sessions` - Active sessions
- `user_statistics` - User analytics

#### DynamoDB Tables
- `scenarios` - Generated scenarios
- `shared_scenarios` - Shared content
- `reports` - Content moderation
- `achievements` - Gamification system
- `posts` & `comments` - Social features

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# Check service health
docker-compose ps
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with refresh tokens
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **Session Management**: Redis-backed sessions with expiration
- **Security Headers**: Helmet.js với CSP, HSTS protection

### Network Security
- **VPC Isolation**: Private subnets for services
- **Security Groups**: Least privilege network access
- **SSL/TLS**: End-to-end encryption
- **Rate Limiting**: Per-user và per-IP limits

### Security Improvements Made
- ✅ Fixed JWT secret validation in production
- ✅ Replaced console.log with proper logging
- ✅ Added input validation and sanitization
- ✅ Implemented proper CORS configuration
- ✅ Added security headers configuration

## 📊 Load Balancer Architecture (FIXED)

### Corrected Architecture
- **ALB**: Routes ALL traffic to API Gateway (port 3000)
- **API Gateway**: Handles routing to appropriate services
- **Frontend**: Served via S3 + CloudFront (NOT through ALB)
- **Health Checks**: API Gateway provides unified health endpoint

### Architecture Problems Fixed:
1. ❌ **Previous**: Frontend was conflicting with Video Service (both port 3005)
2. ✅ **Fixed**: Frontend moved to port 3007
3. ❌ **Previous**: Load balancer was bypassing API Gateway
4. ✅ **Fixed**: All API traffic goes through API Gateway
5. ❌ **Previous**: Direct service access from load balancer
6. ✅ **Fixed**: Services only accessible through API Gateway

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test specific service
cd services/user-service && npm test

# Test full flow
node test-story-hub-flow.js
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:3000/api-docs (development)
- **Health Check**: http://localhost:3000/health
- **API Gateway**: http://localhost:3000

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
```

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
# Build and deploy
./scripts/deploy.sh [environment]
```

## 📈 Monitoring & Observability

### CloudWatch Integration
- Application logs
- Custom metrics
- Performance monitoring
- Alerting

### Health Checks
- **Service Health**: Individual service health endpoints
- **Overall Health**: Unified health check through API Gateway
- **Database Health**: PostgreSQL, DynamoDB, Redis connectivity

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check if ports are in use
   lsof -i :3000,3001,3002,3003,3004,3005,3006,3007
   ```

2. **Database Connection Issues**
   ```bash
   # Check database containers
   docker-compose logs postgres
   docker-compose logs dynamodb
   docker-compose logs redis
   ```

3. **Service Health Issues**
   ```bash
   # Check service health
   curl http://localhost:3000/health
   ```

### Debug Commands

```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs -f [service-name]

# Check DynamoDB tables
node scripts/init-project.js development --verify-only

# Test API Gateway routing
curl http://localhost:3000/health
```

## 🔄 Initialization vs Migration

### ⚠️ Important: No Database Migrations

This project has been updated to focus on **initialization** rather than migration:

- ❌ **Removed**: Database migration scripts
- ✅ **Added**: Fresh initialization scripts
- ✅ **Added**: Health verification tools
- ✅ **Added**: Initial data seeding

### New Initialization Approach

```bash
# Initialize fresh project
node scripts/init-project.js development

# Verify existing setup
node scripts/init-project.js development --verify-only

# Production initialization
node scripts/init-project.js production
```

## 📋 Project Structure

```
what-if-generator/
├── api-gateway/          # API Gateway service
├── services/            # Microservices
│   ├── user-service/    # User authentication
│   ├── generation-service/ # AI scenario generation
│   ├── history-service/ # Scenario history
│   ├── sharing-service/ # Content sharing
│   ├── video-service/   # Video generation
│   └── social-service/  # Social features
├── frontend/            # Next.js frontend
├── shared/              # Shared configurations
│   └── config/          # Environment configs
├── scripts/             # Utility scripts
│   ├── init-project.js  # New initialization script
│   └── setup-local.sh   # Local setup script
├── docker/              # Database init scripts
├── k8s/                 # Kubernetes configs
├── aws/                 # AWS CloudFormation
└── docs/                # Documentation
```

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
- **Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api-docs

---

## 🎉 What's New & Fixed

### ✅ Recent Improvements

1. **Configuration Management**
   - ✅ Complete environment configuration system
   - ✅ Proper .env file hierarchy
   - ✅ Environment-specific settings

2. **Architecture Fixes**
   - ✅ Fixed port conflicts (Frontend: 3005 → 3007)
   - ✅ Corrected load balancer routing
   - ✅ All traffic now goes through API Gateway
   - ✅ Proper service isolation

3. **Security Enhancements**
   - ✅ JWT secret validation in production
   - ✅ Proper logging instead of console.log
   - ✅ Enhanced CORS configuration
   - ✅ Security headers implementation

4. **Database Strategy**
   - ✅ Removed migration scripts
   - ✅ Added initialization-focused approach
   - ✅ Health check and verification tools
   - ✅ Environment-specific database configs

5. **Developer Experience**
   - ✅ Automated setup scripts
   - ✅ Comprehensive documentation
   - ✅ Clear troubleshooting guides
   - ✅ Service health monitoring

### 🚨 Breaking Changes

- **Frontend Port**: Changed from 3005 to 3007
- **Environment Files**: New .env file structure
- **Initialization**: No longer uses migration scripts
- **Load Balancer**: Routes through API Gateway only

**What If Generator** - Khám phá vô vàn khả năng với AI! 🚀