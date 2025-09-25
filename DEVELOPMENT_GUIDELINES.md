# What If Generator - Development Guidelines

## Tổng Quan Dự Án

**What If Generator** là một hệ thống microservices cho phép người dùng tạo ra các viễn cảnh "Nếu như..." sử dụng trí tuệ nhân tạo. Hệ thống được xây dựng theo kiến trúc microservices với 5 services chính và frontend React.

## Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                   Port: 3005                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 API Gateway                                 │
│              Central Entry Point                            │
│                 Port: 3000                                 │
└─────────┬───────────┬───────────┬───────────┬───────────────┘
          │           │           │           │
     ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
     │  User   │ │Generation│ │ History │ │ Sharing │
     │ Service │ │ Service  │ │ Service │ │ Service │
     │ (3001)  │ │  (3002)  │ │ (3003)  │ │ (3004)  │
     └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
          │           │           │           │
          ▼           ▼           ▼           ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
     │PostgreSQL│ │ Redis   │ │ MongoDB │ │ MongoDB │
     │         │ │ (Cache) │ │(History)│ │(Sharing)│
     └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Quy Tắc Phát Triển

### 1. Cấu Trúc Thư Mục

**❌ KHÔNG BAO GIỜ tạo thêm folder backend** - Đã có microservices rồi!

**✅ Cấu trúc đúng:**
```
what-if-generator/
├── api-gateway/          # API Gateway service
├── services/             # Microservices
│   ├── user-service/     # User management
│   ├── generation-service/ # AI scenario generation
│   ├── history-service/  # History management
│   ├── sharing-service/  # Sharing and reporting
│   └── video-service/    # Video generation
├── frontend/             # React frontend
├── docker/               # Docker configurations
├── k8s/                  # Kubernetes configurations
├── docs/                 # Documentation
└── scripts/              # Deployment scripts
```

### 2. Naming Conventions

#### Services
- **Service names**: kebab-case (user-service, generation-service)
- **Ports**: 3000-3005 (không thay đổi)
- **Container names**: what-if-{service-name}

#### Code
- **Files**: camelCase (userController.js, authService.js)
- **Functions**: camelCase (generateScenario, validateUser)
- **Constants**: UPPER_SNAKE_CASE (JWT_SECRET, API_BASE_URL)
- **Database tables**: snake_case (user_profiles, scenario_history)

#### API Endpoints
- **RESTful**: `/api/{resource}/{id}`
- **Actions**: `/api/{resource}/{id}/{action}`
- **Examples**:
  - `GET /api/scenarios/my`
  - `POST /api/generate`
  - `PATCH /api/scenarios/{id}/favorite`

### 3. Technology Stack

#### Backend Services
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator hoặc Joi
- **Logging**: Winston
- **Testing**: Jest + Supertest

#### Databases
- **User Service**: PostgreSQL + Sequelize ORM
- **History Service**: MongoDB + Mongoose
- **Sharing Service**: MongoDB + Mongoose
- **Caching**: Redis

#### Frontend
- **Framework**: React 18+ với TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **HTTP Client**: Axios
- **Build Tool**: Vite

### 4. Code Standards

#### JavaScript/TypeScript
```javascript
// ✅ Good
const generateScenario = async (topic, options = {}) => {
  try {
    const scenario = await aiService.generate(topic, options);
    return { success: true, data: scenario };
  } catch (error) {
    logger.error('Scenario generation failed', { topic, error });
    throw new Error('Failed to generate scenario');
  }
};

// ❌ Bad
function generateScenario(topic, options) {
  return aiService.generate(topic, options);
}
```

#### Error Handling
```javascript
// ✅ Standardized error response
const errorResponse = (res, statusCode, message, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: details,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
};
```

#### Database Queries
```javascript
// ✅ Good - with error handling
const getUserScenarios = async (userId, options) => {
  try {
    const scenarios = await Scenario.find({
      userId,
      isDeleted: false,
      ...options.filter
    })
    .sort(options.sort)
    .limit(options.limit)
    .skip(options.skip);
    
    return scenarios;
  } catch (error) {
    logger.error('Database query failed', { userId, error });
    throw new DatabaseError('Failed to fetch scenarios');
  }
};
```

### 5. API Design Principles

#### Request/Response Format
```json
// ✅ Standard response format
{
  "success": true|false,
  "message": "Descriptive message",
  "data": {
    // Response data here
  },
  "errors": [
    {
      "field": "field_name",
      "message": "Error message",
      "value": "invalid_value"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Validation Error
- **429**: Rate Limit Exceeded
- **500**: Internal Server Error

### 6. Security Guidelines

#### Authentication
```javascript
// ✅ JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

#### Input Validation
```javascript
// ✅ Input validation
const validateScenarioRequest = [
  body('topic')
    .isLength({ min: 3, max: 200 })
    .withMessage('Topic must be between 3 and 200 characters'),
  body('options.promptType')
    .isIn(['default', 'fantasy', 'scientific', 'historical'])
    .withMessage('Invalid prompt type'),
  body('options.temperature')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Temperature must be between 0 and 1')
];
```

#### Rate Limiting
```javascript
// ✅ Rate limiting per service
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: { success: false, message: 'Too many requests' }
});
```

### 7. Database Guidelines

#### PostgreSQL (User Service)
```sql
-- ✅ Good table design
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

#### MongoDB (History/Sharing Services)
```javascript
// ✅ Good schema design
const scenarioSchema = new mongoose.Schema({
  scenarioId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  topic: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true },
  promptType: { 
    type: String, 
    enum: ['default', 'fantasy', 'scientific', 'historical'],
    default: 'default'
  },
  tags: [{ type: String, maxlength: 30 }],
  isFavorite: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound indexes
scenarioSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
scenarioSchema.index({ topic: 'text', content: 'text', tags: 'text' });
```

### 8. Testing Guidelines

#### Unit Tests
```javascript
// ✅ Good test structure
describe('Scenario Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should generate scenario with valid topic', async () => {
    const mockTopic = 'Nếu như con người có thể bay';
    const mockResponse = { content: 'Generated scenario...' };
    
    aiService.generate.mockResolvedValue(mockResponse);
    
    const result = await generateScenario(mockTopic);
    
    expect(result.success).toBe(true);
    expect(result.data.content).toBe(mockResponse.content);
    expect(aiService.generate).toHaveBeenCalledWith(mockTopic, {});
  });
  
  it('should handle AI service errors', async () => {
    aiService.generate.mockRejectedValue(new Error('AI service unavailable'));
    
    await expect(generateScenario('test topic')).rejects.toThrow('Failed to generate scenario');
  });
});
```

#### Integration Tests
```javascript
// ✅ API integration test
describe('POST /api/generate', () => {
  it('should generate scenario for authenticated user', async () => {
    const token = generateTestToken({ id: 'user123' });
    const requestBody = {
      topic: 'Nếu như con người có thể bay',
      options: { promptType: 'fantasy' }
    };
    
    const response = await request(app)
      .post('/api/generate')
      .set('Authorization', `Bearer ${token}`)
      .send(requestBody)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.scenario).toBeDefined();
  });
});
```

### 9. Environment Variables

#### Required Variables per Service
```bash
# API Gateway
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
REDIS_URL=redis://redis:6379
USER_SERVICE_URL=http://user-service:3001
GENERATION_SERVICE_URL=http://generation-service:3002
HISTORY_SERVICE_URL=http://history-service:3003
SHARING_SERVICE_URL=http://sharing-service:3004

# User Service
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=what_if_users
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=your-super-secret-jwt-key
REDIS_URL=redis://redis:6379
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# Generation Service
PORT=3002
GEMINI_API_KEY=your-gemini-api-key
REDIS_URL=redis://redis:6379
HISTORY_SERVICE_URL=http://history-service:3003

# History Service
PORT=3003
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/what_if_history?authSource=admin
REDIS_URL=redis://redis:6379

# Sharing Service
PORT=3004
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/what_if_sharing?authSource=admin
REDIS_URL=redis://redis:6379
```

### 10. Logging Standards

#### Structured Logging
```javascript
// ✅ Good logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

// Usage
logger.info('User logged in', { userId: user.id, email: user.email });
logger.error('Database connection failed', { error: error.message, stack: error.stack });
```

### 11. Git Workflow

#### Branch Naming
- **Feature**: `feature/UC-001-scenario-generation`
- **Bugfix**: `bugfix/fix-login-validation`
- **Hotfix**: `hotfix/security-patch`
- **Release**: `release/v1.2.0`

#### Commit Messages
```
feat: add scenario generation endpoint
fix: resolve JWT token validation issue
docs: update API documentation
refactor: improve error handling in user service
test: add unit tests for generation service
```

### 12. Performance Guidelines

#### Caching Strategy
```javascript
// ✅ Redis caching
const getCachedScenario = async (topic) => {
  const cacheKey = `scenario:${hashTopic(topic)}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const scenario = await generateScenario(topic);
  await redis.setex(cacheKey, 3600, JSON.stringify(scenario)); // 1 hour TTL
  
  return scenario;
};
```

#### Database Optimization
```javascript
// ✅ Efficient queries
const getUserScenarios = async (userId, { page = 1, limit = 20, sort = 'createdAt' }) => {
  const skip = (page - 1) * limit;
  
  return await Scenario.find({ userId, isDeleted: false })
    .sort({ [sort]: -1 })
    .limit(limit)
    .skip(skip)
    .lean(); // Use lean() for better performance
};
```

### 13. Monitoring và Observability

#### Health Checks
```javascript
// ✅ Service health check
const healthCheck = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabaseConnection(),
      redis: await checkRedisConnection(),
      external_apis: await checkExternalAPIs()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check === 'connected');
  health.status = isHealthy ? 'healthy' : 'unhealthy';
  
  res.status(isHealthy ? 200 : 503).json(health);
};
```

### 14. Deployment Guidelines

#### Docker Best Practices
```dockerfile
# ✅ Good Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "src/index.js"]
```

#### Environment-Specific Configs
```yaml
# ✅ Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    spec:
      containers:
      - name: user-service
        image: user-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Kết Luận

Những quy tắc này đảm bảo:
- ✅ **Consistency**: Code style nhất quán across services
- ✅ **Maintainability**: Dễ maintain và debug
- ✅ **Scalability**: Có thể scale từng service độc lập
- ✅ **Security**: Best practices cho security
- ✅ **Performance**: Optimized cho production
- ✅ **Quality**: High code quality với testing

**Lưu ý quan trọng**: KHÔNG BAO GIỜ tạo thêm folder `backend` - hệ thống đã sử dụng microservices architecture!