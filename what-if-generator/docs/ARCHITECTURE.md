# What If Generator - Kiến Trúc Hệ Thống

## Tổng Quan Kiến Trúc

What If Generator được xây dựng theo kiến trúc Microservices với các nguyên tắc:
- **Separation of Concerns**: Mỗi service có trách nhiệm riêng biệt
- **Independent Deployment**: Services có thể deploy độc lập
- **Technology Diversity**: Mỗi service có thể sử dụng tech stack phù hợp
- **Fault Isolation**: Lỗi ở một service không ảnh hưởng đến toàn hệ thống
- **Scalability**: Scale từng service theo nhu cầu

## High-Level Architecture

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

## Microservices Chi Tiết

### 1. User Service (Port 3001)

**Chức năng:**
- UC-002: Đăng ký tài khoản
- UC-003: Đăng nhập/đăng xuất
- UC-005: Quên mật khẩu & reset
- UC-013: Đổi mật khẩu
- UC-014: Đổi email
- UC-015: Xóa tài khoản
- UC-016: Cài đặt giao diện

**Technology Stack:**
- **Framework**: Node.js + Express.js
- **Database**: PostgreSQL với Sequelize ORM
- **Authentication**: JWT với bcrypt
- **Email**: Nodemailer
- **Caching**: Redis
- **Validation**: express-validator

**Database Schema:**
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password VARCHAR (bcrypt hashed),
  first_name VARCHAR,
  last_name VARCHAR,
  is_active BOOLEAN,
  email_verified BOOLEAN,
  preferences JSONB,
  login_attempts INTEGER,
  lock_until TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Key Features:**
- Account lockout after failed attempts
- Email verification
- Password reset with tokens
- GDPR-compliant user deletion
- Role-based access control (RBAC)

### 2. Generation Service (Port 3002)

**Chức năng:**
- UC-001: Tạo viễn cảnh mới
- UC-010: Viễn cảnh ngẫu nhiên
- Tích hợp multiple AI providers
- Content filtering và safety

**Technology Stack:**
- **Framework**: Node.js + Express.js
- **AI Providers**: Google Gemini, OpenAI, Anthropic
- **Caching**: Redis
- **Validation**: Joi
- **Logging**: Winston

**AI Integration:**
```javascript
// Support multiple AI providers
const providers = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider()
};

// Dynamic prompt selection
const promptTypes = {
  default: "General scenarios",
  historical: "Historical what-if scenarios",
  scientific: "Science-based scenarios",
  social: "Social/cultural scenarios",
  fantasy: "Creative fantasy scenarios"
};
```

**Key Features:**
- Multi-provider AI support
- Intelligent prompt selection
- Content safety filtering
- Response caching
- Token usage tracking
- Timeout handling

### 3. History Service (Port 3003)

**Chức năng:**
- UC-004: Xem lịch sử viễn cảnh
- UC-007: Gắn thẻ (Tagging)
- UC-008: Tìm kiếm trong lịch sử
- UC-009: Xóa khỏi lịch sử
- Analytics và metrics

**Technology Stack:**
- **Framework**: Node.js + Express.js
- **Database**: MongoDB với Mongoose
- **Search**: Text indexing + regex
- **Analytics**: Aggregation pipelines

**MongoDB Collections:**
```javascript
scenarios: {
  scenarioId: String (unique),
  userId: String (indexed),
  topic: String,
  content: String,
  promptType: String,
  tags: [String],
  isPublic: Boolean,
  shareUrl: String,
  isFavorite: Boolean,
  rating: Number (1-5),
  viewCount: Number,
  shareCount: Number,
  isDeleted: Boolean (soft delete)
}

scenario_analytics: {
  scenarioId: String,
  userId: String,
  date: Date,
  views: Number,
  shares: Number,
  ratings: [Number],
  averageRating: Number
}
```

**Key Features:**
- Full-text search across topics, content, tags
- Tag-based organization
- Favorites system
- Soft delete with retention
- Analytics tracking
- Bulk operations

### 4. Sharing Service (Port 3004)

**Chức năng:**
- UC-006: Chia sẻ viễn cảnh
- UC-011: Báo cáo nội dung
- UC-012: Sao chép nội dung
- QR code generation
- Social media integration

**Technology Stack:**
- **Framework**: Node.js + Express.js
- **Database**: MongoDB
- **QR Codes**: qrcode library
- **URL Shortening**: Custom implementation
- **Social APIs**: Platform-specific SDKs

**MongoDB Collections:**
```javascript
shared_scenarios: {
  scenarioId: String,
  userId: String,
  shareUrl: String (unique),
  shortUrl: String,
  scenarioData: Object,
  isPasswordProtected: Boolean,
  expiresAt: Date,
  viewCount: Number,
  sharesByPlatform: Object,
  isHidden: Boolean (for moderation)
}

reports: {
  targetType: String,
  targetId: String,
  reason: String,
  severity: String,
  status: String,
  reporterId: String,
  priorityScore: Number,
  autoModerationScore: Number
}
```

**Key Features:**
- Public sharing with unique URLs
- Password protection
- Expiration dates
- QR code generation
- Social media integration
- Content moderation system
- Auto-moderation with ML

### 5. API Gateway (Port 3000)

**Chức năng:**
- Single entry point
- Request routing
- Load balancing
- Rate limiting
- Health monitoring
- Authentication proxy

**Technology Stack:**
- **Framework**: Node.js + Express.js
- **Proxy**: http-proxy-middleware
- **Rate Limiting**: express-rate-limit + Redis
- **Health Checks**: Periodic service monitoring
- **Caching**: Redis

**Key Features:**
- Dynamic service discovery
- Circuit breaker pattern
- Request/response transformation
- Centralized rate limiting
- Health-based routing
- Request tracing

## Data Flow Examples

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

## Security Architecture

### 1. Authentication & Authorization
```
┌─────────────┐
│   Frontend  │
│             │
│ JWT Tokens  │
└──────┬──────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│ API Gateway │────│ User Service│
│             │    │             │
│ Token Verify│    │ Auth Logic  │
└──────┬──────┘    └─────────────┘
       │
       ▼
┌─────────────┐
│   Services  │
│             │
│ User Context│
└─────────────┘
```

### 2. Rate Limiting Strategy
```
Anonymous Users:    100 req/15min
Authenticated:      1000 req/15min
Premium Users:      5000 req/15min
Admin Users:        Unlimited

Generation Specific:
Anonymous:          10 req/15min
Authenticated:      50 req/15min
Premium:            200 req/15min
```

### 3. Data Protection
- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS/TLS
- **PII Protection**: Email masking, GDPR compliance
- **Password Security**: bcrypt with salt rounds = 12
- **Session Management**: JWT with refresh tokens

## Scalability Considerations

### 1. Horizontal Scaling
- **Stateless Services**: All services are stateless
- **Database Sharding**: MongoDB can be sharded by userId
- **Cache Distribution**: Redis cluster for large deployments
- **Load Balancing**: nginx or cloud load balancers

### 2. Vertical Scaling
- **Memory**: Generation service needs more memory for AI processing
- **CPU**: All services benefit from more CPU cores
- **Storage**: History service needs more storage for scenarios

### 3. Auto-scaling Rules
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
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Performance Benchmarks

### Target Performance Metrics
- **Scenario Generation**: < 5 seconds (95th percentile)
- **Page Load**: < 2 seconds
- **API Response**: < 500ms (non-generation endpoints)
- **Throughput**: 1000 concurrent users
- **Availability**: 99.5% uptime

### Optimization Strategies
1. **Caching Layers**:
   - Redis for session data
   - CDN for static assets
   - Database query result caching

2. **Database Optimization**:
   - Proper indexing strategy
   - Connection pooling
   - Query optimization

3. **AI Service Optimization**:
   - Response caching
   - Batch processing
   - Provider failover

## Monitoring and Observability

### 1. Health Checks
```javascript
// Service health check example
{
  "status": "healthy",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "external_api": "responding",
    "memory_usage": "normal",
    "cpu_usage": "normal"
  },
  "metrics": {
    "uptime": 3600,
    "requests_per_minute": 50,
    "error_rate": 0.1,
    "response_time_avg": 200
  }
}
```

### 2. Logging Strategy
```javascript
// Structured logging example
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "info",
  "service": "generation-service",
  "requestId": "req-123",
  "userId": "user-456",
  "action": "generate_scenario",
  "topic": "Nếu như con người có thể bay",
  "duration": 3500,
  "tokens_used": 350,
  "provider": "gemini"
}
```

### 3. Metrics Collection
- **Application Metrics**: Request count, response times, error rates
- **Business Metrics**: Scenarios generated, user registrations, shares
- **Infrastructure Metrics**: CPU, memory, disk usage
- **External API Metrics**: AI provider response times, costs

## Deployment Strategies

### 1. Blue-Green Deployment
```bash
# Deploy new version to green environment
kubectl apply -f k8s/green/

# Switch traffic after validation
kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"green"}}}'

# Remove blue environment
kubectl delete -f k8s/blue/
```

### 2. Rolling Updates
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

### 3. Canary Deployment
```yaml
# Traffic splitting with service mesh
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: generation-service-vs
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: generation-service-canary
  - route:
    - destination:
        host: generation-service
      weight: 90
    - destination:
        host: generation-service-canary
      weight: 10
```

## Security Architecture

### 1. Network Security
```
Internet → WAF → Load Balancer → API Gateway → Services
                                      ↓
                              Private Network Only
                                      ↓
                               Databases (No Public Access)
```

### 2. Authentication Flow
```
1. User Login → User Service validates → JWT issued
2. JWT stored in httpOnly cookie (Frontend)
3. JWT sent in Authorization header
4. API Gateway validates JWT
5. User context passed to downstream services
```

### 3. Authorization Matrix

| Role | Generate | View History | Share | Admin |
|------|----------|--------------|-------|--------|
| Anonymous | ✓ (limited) | ✗ | ✗ | ✗ |
| User | ✓ | ✓ (own) | ✓ (own) | ✗ |
| Moderator | ✓ | ✓ (own) | ✓ (own) | ✓ (reports) |
| Admin | ✓ | ✓ (all) | ✓ (all) | ✓ (full) |

## Disaster Recovery

### 1. Backup Strategy
```bash
# Daily automated backups
0 2 * * * /scripts/backup-postgres.sh
0 3 * * * /scripts/backup-mongodb.sh

# Weekly full system backup
0 4 * * 0 /scripts/full-system-backup.sh
```

### 2. Recovery Procedures
1. **Service Failure**: Auto-restart with health checks
2. **Database Failure**: Restore from latest backup
3. **Complete System Failure**: Multi-region deployment

### 3. Data Retention
- **User Data**: Indefinite (until user deletion)
- **Scenarios**: 1 year after soft delete
- **Logs**: 90 days
- **Analytics**: 2 years
- **Reports**: 1 year after resolution

## Development Guidelines

### 1. Service Development
```javascript
// Standard service structure
src/
├── controllers/     // Request handlers
├── models/         // Data models
├── routes/         // Route definitions
├── middleware/     // Custom middleware
├── services/       // Business logic
├── config/         // Configuration
└── utils/          // Helper functions
```

### 2. API Design Principles
- **RESTful**: Use standard HTTP methods
- **Versioning**: API version in URL path
- **Pagination**: Consistent pagination format
- **Error Handling**: Standard error response format
- **Documentation**: OpenAPI/Swagger specs

### 3. Testing Strategy
```
Unit Tests:         95% coverage minimum
Integration Tests:  Key user journeys
Load Tests:         1000 concurrent users
Security Tests:     OWASP compliance
E2E Tests:          Critical business flows
```

## Future Enhancements

### 1. Advanced AI Features
- **Multi-modal Generation**: Images + text scenarios
- **Interactive Scenarios**: User can influence direction
- **Collaborative Generation**: Multiple users contribute
- **AI Fine-tuning**: Custom models for better Vietnamese

### 2. Enhanced Social Features
- **User Communities**: Topic-based groups
- **Scenario Competitions**: Voting and rankings
- **Social Feed**: Timeline of public scenarios
- **User Profiles**: Public profiles with stats

### 3. Analytics and ML
- **Usage Analytics**: User behavior tracking
- **Content Analytics**: Popular topics, trends
- **Recommendation Engine**: Suggest topics to users
- **Quality Scoring**: AI-based content quality assessment

### 4. Mobile and API
- **Mobile Apps**: React Native apps
- **Public API**: External developer access
- **Webhooks**: Real-time notifications
- **GraphQL**: Alternative query language

### 5. Enterprise Features
- **Multi-tenant**: Organization accounts
- **Custom Branding**: White-label solutions
- **Advanced Analytics**: Business intelligence
- **Compliance**: SOC2, HIPAA if needed

## Conclusion

Kiến trúc microservices của What If Generator cung cấp:
- **Flexibility**: Dễ dàng thêm features mới
- **Reliability**: Fault tolerance và recovery
- **Scalability**: Scale theo nhu cầu
- **Maintainability**: Code organization tốt
- **Performance**: Optimized cho user experience

Hệ thống được thiết kế để phát triển từ MVP đến enterprise-scale platform, với khả năng hỗ trợ hàng triệu người dùng và hàng triệu scenarios.