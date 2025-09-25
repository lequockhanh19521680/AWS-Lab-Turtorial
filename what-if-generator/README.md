# What If Generator

AI-powered scenario generation platform with microservices architecture.

## 🚀 Quick Start

```bash
# Clone repository
git clone <repository-url>
cd what-if-generator

# Copy environment template
cp .env.example .env

# Start with Docker Compose
docker-compose up -d

# Access application
open http://localhost:3005
```

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+

## 🏗️ Architecture

### Microservices
- **API Gateway** (3000) - Entry point, routing, auth
- **User Service** (3001) - User management, authentication
- **Generation Service** (3002) - AI scenario generation
- **History Service** (3003) - Scenario history management
- **Sharing Service** (3004) - Sharing and reporting
- **Video Service** (3005) - Video generation
- **Social Service** (3006) - Social features
- **Frontend** (3005) - React application

### Databases
- **PostgreSQL** - User data
- **MongoDB** - Scenario history & sharing
- **Redis** - Caching & sessions

## 🔧 Environment Configuration

### Global Configuration
- `.env` - Global defaults
- `.env.development` - Development overrides
- `.env.test` - Test environment
- `.env.production` - Production settings

### Required Environment Variables
```bash
# Database
POSTGRES_DB=what_if_users
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
MONGODB_URI=mongodb://admin:admin123@localhost:27017
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AI Provider
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 🚀 Deployment

### Development
```bash
docker-compose up -d
```

### Production (AWS)
```bash
# Deploy infrastructure
aws cloudformation deploy --template-file infrastructure/main.yaml

# Deploy services
./scripts/deploy.sh production
```

## 🔒 Security

- JWT authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation

## 📊 Monitoring

- Health checks on all services
- Structured logging
- Metrics collection
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details