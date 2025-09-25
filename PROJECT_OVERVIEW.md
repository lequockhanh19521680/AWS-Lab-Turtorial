# What If Generator - Project Overview

## Tổng Quan Dự Án

**What If Generator** là một hệ thống web application cho phép người dùng tạo ra các viễn cảnh "Nếu như..." thú vị và hấp dẫn sử dụng trí tuệ nhân tạo. Hệ thống được xây dựng theo kiến trúc microservices với 5 services chính và frontend React.

## Mục Tiêu Dự Án

### Mục Tiêu Chính
- Tạo ra một platform cho phép người dùng khám phá các viễn cảnh "Nếu như..." thú vị
- Sử dụng AI để tạo ra nội dung chất lượng cao và đa dạng
- Cung cấp trải nghiệm người dùng mượt mà và trực quan
- Hỗ trợ chia sẻ và tương tác xã hội

### Mục Tiêu Kỹ Thuật
- Xây dựng hệ thống microservices có thể scale
- Đảm bảo security và performance cao
- Dễ dàng maintain và extend
- Hỗ trợ multiple AI providers

## Kiến Trúc Tổng Thể

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    External Users                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS/HTTP
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Load Balancer                                │
│              (Nginx/Kubernetes)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Frontend Layer                              │
│                  React App                                  │
│                 (Port 3005)                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ API Calls
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 API Gateway                                 │
│              Central Entry Point                            │
│                 (Port 3000)                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  • Request Routing                                  │   │
│   │  • Authentication                                   │   │
│   │  • Rate Limiting                                    │   │
│   │  • Load Balancing                                   │   │
│   │  • Health Monitoring                                │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────┬───────────┬───────────┬───────────┬───────────────┘
          │           │           │           │
          ▼           ▼           ▼           ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
     │  User   │ │Generation│ │ History │ │ Sharing │
     │ Service │ │ Service  │ │ Service │ │ Service │
     │ (3001)  │ │  (3002)  │ │ (3003)  │ │ (3004)  │
     └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
          │           │           │           │
          ▼           ▼           ▼           ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
     │PostgreSQL│ │ Gemini  │ │ MongoDB │ │ MongoDB │
     │         │ │   API   │ │         │ │         │
     └─────────┘ └─────────┘ └─────────┘ └─────────┘
          │                       │           │
          └───────────┬───────────┴───────────┘
                      │
                 ┌─────▼─────┐
                 │   Redis   │
                 │  (Cache)  │
                 └───────────┘
```

### Microservices Overview

#### 1. API Gateway (Port 3000)
**Chức năng**: Central entry point, routing, authentication, rate limiting
**Database**: Redis (caching)
**Key Features**:
- Request routing to microservices
- JWT authentication
- Rate limiting per user/IP
- Health monitoring
- Load balancing

#### 2. User Service (Port 3001)
**Chức năng**: User management, authentication, profile management
**Database**: PostgreSQL
**Key Features**:
- User registration/login
- Password management
- Email verification
- Profile management
- Account settings

#### 3. Generation Service (Port 3002)
**Chức năng**: AI scenario generation, multiple AI providers
**Database**: Redis (caching)
**Key Features**:
- AI scenario generation
- Multiple AI providers (Gemini, OpenAI, Anthropic)
- Content filtering
- Response caching
- Prompt engineering

#### 4. History Service (Port 3003)
**Chức năng**: Scenario history management, search, analytics
**Database**: MongoDB
**Key Features**:
- Scenario storage
- Search and filtering
- Tagging system
- Analytics
- Favorites management

#### 5. Sharing Service (Port 3004)
**Chức năng**: Sharing scenarios, reporting, QR codes
**Database**: MongoDB
**Key Features**:
- Scenario sharing
- QR code generation
- Social media integration
- Content moderation
- Reporting system

#### 6. Video Service (Port 3005)
**Chức năng**: Video generation from scenarios
**Database**: Redis (caching)
**Key Features**:
- Video generation
- Text-to-speech
- Multiple video providers
- File management
- Video processing

#### 7. Frontend (React + Next.js)
**Chức năng**: User interface, state management
**Key Features**:
- Responsive design
- Real-time updates
- State management
- Authentication UI
- Scenario generation UI

## Use Cases

### Core Use Cases
1. **UC-001**: Tạo viễn cảnh mới
2. **UC-002**: Đăng ký tài khoản
3. **UC-003**: Đăng nhập
4. **UC-004**: Xem lịch sử viễn cảnh
5. **UC-005**: Quên mật khẩu
6. **UC-006**: Chia sẻ viễn cảnh
7. **UC-007**: Gắn thẻ (Tag) cho viễn cảnh
8. **UC-008**: Tìm kiếm viễn cảnh trong lịch sử
9. **UC-009**: Xóa viễn cảnh khỏi lịch sử
10. **UC-010**: Xem viễn cảnh ngẫu nhiên
11. **UC-011**: Báo cáo viễn cảnh không phù hợp
12. **UC-012**: Sao chép nội dung viễn cảnh
13. **UC-013**: Đổi mật khẩu
14. **UC-014**: Đổi email
15. **UC-015**: Xóa tài khoản
16. **UC-016**: Thay đổi cài đặt giao diện

### Extended Use Cases
17. **UC-017**: Tạo video từ viễn cảnh
18. **UC-018**: Chia sẻ video
19. **UC-019**: Tạo viễn cảnh batch
20. **UC-020**: Xuất viễn cảnh ra file

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator, Joi
- **Logging**: Winston
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: React 18+ với Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Databases
- **PostgreSQL**: User data (User Service)
- **MongoDB**: Scenario history (History Service)
- **MongoDB**: Sharing data (Sharing Service)
- **Redis**: Caching và session management

### AI & Video
- **AI Providers**: Google Gemini, OpenAI, Anthropic
- **Video Providers**: Runway ML, Pika Labs, Stability AI
- **TTS**: Google Cloud TTS

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Load Balancing**: Nginx
- **Monitoring**: Health checks, logging

## Data Flow

### 1. Scenario Generation Flow
```
User → Frontend → API Gateway → Generation Service → AI Provider
                       ↓
                History Service ← Generated Content
                       ↓
                  User's History
```

### 2. Authentication Flow
```
User → Frontend → API Gateway → User Service → PostgreSQL
                       ↓                ↓
                   JWT Token      User Profile
                       ↓                ↓
                  Local Storage    Redis Cache
```

### 3. Sharing Flow
```
User → Frontend → API Gateway → Sharing Service → MongoDB
                       ↓                ↓
                History Service   Shared Scenarios
                       ↓                ↓
              Update Share Count   Public Access
```

### 4. Video Generation Flow
```
User → Frontend → API Gateway → Video Service → Video Provider
                       ↓                ↓
                History Service   Generated Video
                       ↓                ↓
              Update Video Count   File Storage
```

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Access token (24h) + Refresh token (7d)
- **Password Security**: bcrypt với salt rounds = 12
- **Account Lockout**: 5 failed attempts → 2 hours lock
- **Email Verification**: Required for account activation

### Rate Limiting
- **Anonymous Users**: 100 req/15min
- **Authenticated Users**: 1000 req/15min
- **Generation Endpoints**: 50 req/15min (authenticated), 10 req/15min (anonymous)
- **Authentication Endpoints**: 20 req/15min

### Data Protection
- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS/TLS
- **PII Protection**: Email masking, GDPR compliance
- **Session Management**: JWT với refresh tokens

## Performance Targets

### Response Times
- **Scenario Generation**: < 5 seconds (95th percentile)
- **Page Load**: < 2 seconds
- **API Response**: < 500ms (non-generation endpoints)
- **Database Queries**: < 100ms

### Throughput
- **Concurrent Users**: 1000
- **Requests per Minute**: 1000
- **Scenarios per Day**: 10,000
- **API Calls per Day**: 100,000

### Availability
- **Uptime**: 99.5%
- **Error Rate**: < 0.1%
- **Recovery Time**: < 5 minutes

## Scalability Strategy

### Horizontal Scaling
- **Stateless Services**: All services are stateless
- **Database Sharding**: MongoDB can be sharded by userId
- **Cache Distribution**: Redis cluster for large deployments
- **Load Balancing**: nginx or cloud load balancers

### Vertical Scaling
- **Memory**: Generation service needs more memory for AI processing
- **CPU**: All services benefit from more CPU cores
- **Storage**: History service needs more storage for scenarios

### Auto-scaling Rules
```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: generation-service-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: generation-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring & Observability

### Health Checks
- **Service Health**: Database, Redis, external APIs
- **System Metrics**: CPU, memory, disk usage
- **Business Metrics**: Scenarios generated, user registrations, shares

### Logging
- **Structured Logging**: JSON format with timestamps
- **Log Levels**: error, warn, info, http, verbose, debug
- **Log Aggregation**: Centralized logging system

### Metrics
- **Application Metrics**: Request count, response times, error rates
- **Business Metrics**: Scenarios generated, user registrations, shares
- **Infrastructure Metrics**: CPU, memory, disk usage

## Deployment Strategy

### Development
- **Docker Compose**: Local development environment
- **Hot Reload**: Code changes reflected immediately
- **Debug Mode**: Detailed logging and error messages

### Production
- **Kubernetes**: Container orchestration
- **Blue-Green Deployment**: Zero-downtime deployments
- **Rolling Updates**: Gradual service updates
- **Canary Deployment**: Gradual traffic shifting

### CI/CD Pipeline
1. **Code Commit**: Trigger build pipeline
2. **Build**: Create Docker images
3. **Test**: Run unit and integration tests
4. **Deploy**: Deploy to staging environment
5. **Validate**: Run smoke tests
6. **Promote**: Deploy to production

## Development Guidelines

### Code Standards
- **JavaScript/TypeScript**: ESLint + Prettier
- **API Design**: RESTful principles
- **Error Handling**: Standardized error responses
- **Testing**: Unit tests (95% coverage), integration tests

### Git Workflow
- **Branch Naming**: feature/UC-001-scenario-generation
- **Commit Messages**: Conventional commits
- **Code Review**: Required for all changes
- **Merge Strategy**: Squash and merge

### Documentation
- **API Documentation**: OpenAPI/Swagger
- **Code Documentation**: JSDoc comments
- **Architecture Documentation**: Updated with changes
- **Deployment Documentation**: Step-by-step guides

## Future Enhancements

### Phase 2 Features
- **Multi-modal Generation**: Images + text scenarios
- **Interactive Scenarios**: User can influence direction
- **Collaborative Generation**: Multiple users contribute
- **AI Fine-tuning**: Custom models for better Vietnamese

### Phase 3 Features
- **User Communities**: Topic-based groups
- **Scenario Competitions**: Voting and rankings
- **Social Feed**: Timeline of public scenarios
- **User Profiles**: Public profiles with stats

### Phase 4 Features
- **Mobile Apps**: React Native apps
- **Public API**: External developer access
- **Webhooks**: Real-time notifications
- **GraphQL**: Alternative query language

## Success Metrics

### User Engagement
- **Daily Active Users**: 1000+
- **Scenarios Generated**: 10,000+ per day
- **User Retention**: 70%+ after 7 days
- **Session Duration**: 5+ minutes average

### Technical Performance
- **Uptime**: 99.5%+
- **Response Time**: < 2 seconds
- **Error Rate**: < 0.1%
- **User Satisfaction**: 4.5+ stars

### Business Impact
- **User Growth**: 20%+ month-over-month
- **Content Quality**: 4.5+ average rating
- **Social Sharing**: 1000+ shares per day
- **Community Engagement**: 500+ active users

## Risk Management

### Technical Risks
- **AI Provider Outages**: Multiple providers, fallback mechanisms
- **Database Failures**: Replication, backup strategies
- **High Load**: Auto-scaling, rate limiting
- **Security Breaches**: Regular audits, monitoring

### Business Risks
- **User Adoption**: Marketing, user feedback
- **Content Quality**: AI fine-tuning, human review
- **Competition**: Unique features, user experience
- **Regulatory**: Compliance, data protection

## Conclusion

What If Generator là một hệ thống microservices hoàn chỉnh được thiết kế để:

- ✅ **Tạo ra trải nghiệm người dùng tuyệt vời** với AI-generated content
- ✅ **Scale được** từ MVP đến enterprise-level platform
- ✅ **Maintain được** với clean architecture và comprehensive documentation
- ✅ **Extend được** với new features và AI providers
- ✅ **Secure được** với best practices và monitoring

Hệ thống sẵn sàng cho production deployment và có thể hỗ trợ hàng triệu người dùng với hàng triệu scenarios được tạo ra mỗi ngày.