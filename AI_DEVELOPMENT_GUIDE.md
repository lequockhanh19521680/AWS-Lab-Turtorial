# What If Generator - AI Development Guide

## Tổng Quan cho AI Assistant

Đây là hướng dẫn chi tiết cho AI assistant khi phát triển dự án **What If Generator**. Dự án này sử dụng kiến trúc microservices với 5 services chính và frontend React.

## Kiến Trúc Hệ Thống

### Services Overview
1. **API Gateway** (Port 3000) - Entry point, routing, auth
2. **User Service** (Port 3001) - User management, authentication
3. **Generation Service** (Port 3002) - AI scenario generation
4. **History Service** (Port 3003) - Scenario history management
5. **Sharing Service** (Port 3004) - Sharing and reporting
6. **Video Service** (Port 3005) - Video generation (new feature)
7. **Frontend** (Port 3005) - React application

### Database Architecture
- **PostgreSQL**: User data (User Service)
- **MongoDB**: Scenario history (History Service)
- **MongoDB**: Sharing data (Sharing Service)
- **Redis**: Caching và session management

## Quy Tắc Quan Trọng

### ❌ TUYỆT ĐỐI KHÔNG
1. **Tạo folder `backend`** - Đã có microservices rồi!
2. **Tạo folder `server`** - Đã có API Gateway rồi!
3. **Thay đổi port numbers** - Đã cố định 3000-3005
4. **Tạo monolith structure** - Đây là microservices!

### ✅ Cấu Trúc Đúng
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

## Service-Specific Guidelines

### 1. API Gateway (Port 3000)
**Chức năng**: Central entry point, routing, authentication, rate limiting

**Cấu trúc thư mục**:
```
api-gateway/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── logger.js         # Logging configuration
│   │   ├── redis.js          # Redis connection
│   │   └── services.js       # Service URLs
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── proxy.js          # Request proxying
│   │   └── rateLimiter.js    # Rate limiting
│   ├── routes/
│   │   └── health.js         # Health check routes
│   └── services/
│       └── healthCheck.js    # Health check service
├── Dockerfile
└── package.json
```

**Khi thêm features**:
- Thêm routes trong `src/routes/`
- Thêm middleware trong `src/middleware/`
- Cập nhật service URLs trong `src/config/services.js`

### 2. User Service (Port 3001)
**Chức năng**: User management, authentication, profile management

**Cấu trúc thư mục**:
```
services/user-service/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── database.js       # PostgreSQL connection
│   │   ├── redis.js          # Redis connection
│   │   └── email.js          # Email configuration
│   ├── controllers/
│   │   ├── authController.js # Authentication logic
│   │   └── userController.js # User management
│   ├── models/
│   │   └── User.js           # User model (Sequelize)
│   ├── routes/
│   │   ├── auth.js           # Auth routes
│   │   └── users.js          # User routes
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   └── validation.js     # Input validation
│   ├── services/
│   │   ├── authService.js    # Auth business logic
│   │   └── emailService.js   # Email sending
│   └── utils/
│       ├── jwt.js            # JWT utilities
│       └── password.js       # Password hashing
├── Dockerfile
└── package.json
```

**Khi thêm features**:
- Thêm controllers trong `src/controllers/`
- Thêm routes trong `src/routes/`
- Thêm services trong `src/services/`
- Cập nhật User model nếu cần

### 3. Generation Service (Port 3002)
**Chức năng**: AI scenario generation, multiple AI providers

**Cấu trúc thư mục**:
```
services/generation-service/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── aiProviders.js    # AI provider configs
│   │   └── redis.js          # Redis connection
│   ├── controllers/
│   │   └── generationController.js # Generation logic
│   ├── services/
│   │   ├── aiService.js      # AI service orchestration
│   │   ├── providers/
│   │   │   ├── geminiProvider.js    # Google Gemini
│   │   │   ├── openaiProvider.js    # OpenAI
│   │   │   └── anthropicProvider.js # Anthropic
│   │   └── cacheService.js   # Response caching
│   ├── routes/
│   │   └── generation.js     # Generation routes
│   ├── middleware/
│   │   └── validation.js     # Input validation
│   └── utils/
│       ├── promptBuilder.js  # Prompt construction
│       └── contentFilter.js  # Content filtering
├── Dockerfile
└── package.json
```

**Khi thêm features**:
- Thêm AI providers trong `src/services/providers/`
- Thêm prompt types trong `src/utils/promptBuilder.js`
- Cập nhật content filtering nếu cần

### 4. History Service (Port 3003)
**Chức năng**: Scenario history management, search, analytics

**Cấu trúc thư mục**:
```
services/history-service/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── redis.js          # Redis connection
│   ├── controllers/
│   │   └── scenarioController.js # Scenario management
│   ├── models/
│   │   └── Scenario.js       # Scenario model (Mongoose)
│   ├── routes/
│   │   └── scenarios.js      # Scenario routes
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   └── validation.js     # Input validation
│   ├── services/
│   │   ├── scenarioService.js # Scenario business logic
│   │   ├── searchService.js  # Search functionality
│   │   └── analyticsService.js # Analytics
│   └── utils/
│       ├── pagination.js     # Pagination utilities
│       └── searchUtils.js    # Search utilities
├── Dockerfile
└── package.json
```

**Khi thêm features**:
- Thêm search functionality trong `src/services/searchService.js`
- Thêm analytics trong `src/services/analyticsService.js`
- Cập nhật Scenario model nếu cần

### 5. Sharing Service (Port 3004)
**Chức năng**: Sharing scenarios, reporting, QR codes

**Cấu trúc thư mục**:
```
services/sharing-service/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── redis.js          # Redis connection
│   ├── controllers/
│   │   ├── sharingController.js # Sharing logic
│   │   └── reportController.js  # Reporting logic
│   ├── models/
│   │   ├── SharedScenario.js # Shared scenario model
│   │   └── Report.js          # Report model
│   ├── routes/
│   │   ├── sharing.js        # Sharing routes
│   │   └── reports.js        # Report routes
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   └── validation.js     # Input validation
│   ├── services/
│   │   ├── sharingService.js # Sharing business logic
│   │   ├── qrService.js      # QR code generation
│   │   └── moderationService.js # Content moderation
│   └── utils/
│       ├── urlShortener.js   # URL shortening
│       └── socialMedia.js    # Social media integration
├── Dockerfile
└── package.json
```

**Khi thêm features**:
- Thêm social media platforms trong `src/utils/socialMedia.js`
- Thêm moderation rules trong `src/services/moderationService.js`
- Cập nhật sharing models nếu cần

### 6. Video Service (Port 3005)
**Chức năng**: Video generation from scenarios

**Cấu trúc thư mục**:
```
services/video-service/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── videoProviders.js # Video provider configs
│   │   └── redis.js          # Redis connection
│   ├── controllers/
│   │   └── videoController.js # Video generation logic
│   ├── services/
│   │   ├── videoService.js   # Video service orchestration
│   │   ├── providers/
│   │   │   ├── runwayProvider.js    # Runway ML
│   │   │   ├── pikaProvider.js      # Pika Labs
│   │   │   └── stabilityProvider.js # Stability AI
│   │   ├── ttsService.js     # Text-to-speech
│   │   └── fileService.js    # File management
│   ├── routes/
│   │   └── video.js          # Video routes
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   └── validation.js     # Input validation
│   └── utils/
│       ├── videoProcessor.js # Video processing
│       └── fileUtils.js      # File utilities
├── Dockerfile
└── package.json
```

**Khi thêm features**:
- Thêm video providers trong `src/services/providers/`
- Thêm video effects trong `src/utils/videoProcessor.js`
- Cập nhật file management nếu cần

### 7. Frontend (React)
**Chức năng**: User interface, state management

**Cấu trúc thư mục**:
```
frontend/
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   ├── login/            # Login page
│   │   ├── register/         # Register page
│   │   └── history/          # History page
│   ├── components/           # React components
│   │   ├── Header.tsx        # Header component
│   │   ├── ScenarioGenerator.tsx # Main generator
│   │   └── ui/               # UI components
│   ├── lib/                  # Utilities
│   │   ├── api.ts            # API client
│   │   └── utils.ts          # Helper functions
│   ├── services/             # Service layer
│   │   └── api.ts            # API service
│   ├── types/                # TypeScript types
│   │   └── index.ts          # Type definitions
│   └── styles/               # Styling
│       └── globals.css       # Global styles
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
└── package.json
```

**Khi thêm features**:
- Thêm pages trong `src/app/`
- Thêm components trong `src/components/`
- Thêm types trong `src/types/`
- Cập nhật API client nếu cần

## Development Workflow

### 1. Khi Thêm Feature Mới
1. **Xác định service cần thay đổi**
2. **Thêm routes trong service đó**
3. **Thêm controllers cho business logic**
4. **Thêm services cho complex logic**
5. **Cập nhật models nếu cần**
6. **Thêm tests**
7. **Cập nhật API Gateway routing**
8. **Cập nhật frontend nếu cần**

### 2. Khi Fix Bug
1. **Xác định service có bug**
2. **Check logs để debug**
3. **Fix trong service đó**
4. **Test fix**
5. **Deploy service**

### 3. Khi Thêm AI Provider
1. **Thêm provider trong `generation-service/src/services/providers/`**
2. **Cập nhật `aiService.js` để support provider mới**
3. **Thêm config trong `aiProviders.js`**
4. **Test với provider mới**

### 4. Khi Thêm Database Field
1. **Cập nhật model trong service tương ứng**
2. **Tạo migration nếu cần**
3. **Cập nhật validation**
4. **Cập nhật API responses**
5. **Cập nhật frontend types**

## Code Patterns

### 1. Service Pattern
```javascript
// ✅ Good service pattern
class ScenarioService {
  constructor() {
    this.cache = new RedisCache();
    this.aiService = new AIService();
  }
  
  async generateScenario(topic, options) {
    try {
      // Check cache first
      const cached = await this.cache.get(`scenario:${topic}`);
      if (cached) return cached;
      
      // Generate new scenario
      const scenario = await this.aiService.generate(topic, options);
      
      // Cache result
      await this.cache.set(`scenario:${topic}`, scenario, 3600);
      
      return scenario;
    } catch (error) {
      logger.error('Scenario generation failed', { topic, error });
      throw new ServiceError('Failed to generate scenario');
    }
  }
}
```

### 2. Controller Pattern
```javascript
// ✅ Good controller pattern
const generateScenario = async (req, res) => {
  try {
    const { topic, options } = req.body;
    const userId = req.user?.id;
    
    // Validate input
    const validation = validateScenarioRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    // Generate scenario
    const scenario = await scenarioService.generateScenario(topic, options);
    
    // Save to history if user authenticated
    if (userId) {
      await historyService.saveScenario(userId, scenario);
    }
    
    res.json({
      success: true,
      data: { scenario }
    });
  } catch (error) {
    logger.error('Generation controller error', { error });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
```

### 3. Model Pattern
```javascript
// ✅ Good model pattern
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
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Static methods
scenarioSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, isDeleted: false };
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

// Instance methods
scenarioSchema.methods.toggleFavorite = function() {
  this.isFavorite = !this.isFavorite;
  return this.save();
};
```

## Testing Guidelines

### 1. Unit Tests
```javascript
// ✅ Good unit test
describe('ScenarioService', () => {
  let scenarioService;
  let mockCache;
  let mockAIService;
  
  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    mockAIService = {
      generate: jest.fn()
    };
    scenarioService = new ScenarioService(mockCache, mockAIService);
  });
  
  it('should generate scenario and cache result', async () => {
    const topic = 'Test topic';
    const expectedScenario = { content: 'Generated content' };
    
    mockCache.get.mockResolvedValue(null);
    mockAIService.generate.mockResolvedValue(expectedScenario);
    
    const result = await scenarioService.generateScenario(topic);
    
    expect(result).toEqual(expectedScenario);
    expect(mockCache.set).toHaveBeenCalledWith(`scenario:${topic}`, expectedScenario, 3600);
  });
});
```

### 2. Integration Tests
```javascript
// ✅ Good integration test
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

## Deployment Guidelines

### 1. Docker
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

### 2. Kubernetes
```yaml
# ✅ Good Kubernetes deployment
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Common Mistakes to Avoid

### ❌ Don't Do This
1. **Tạo folder `backend`** - Đã có microservices!
2. **Thay đổi port numbers** - Đã cố định!
3. **Tạo monolith structure** - Đây là microservices!
4. **Hardcode service URLs** - Sử dụng environment variables!
5. **Skip error handling** - Luôn handle errors!
6. **Skip validation** - Luôn validate input!
7. **Skip logging** - Luôn log important events!

### ✅ Do This Instead
1. **Sử dụng microservices structure** - Đã có sẵn!
2. **Giữ nguyên port numbers** - 3000-3005!
3. **Follow service boundaries** - Mỗi service có trách nhiệm riêng!
4. **Sử dụng environment variables** - Configurable!
5. **Handle errors properly** - Try-catch và proper responses!
6. **Validate all inputs** - Security và data integrity!
7. **Log everything important** - Debugging và monitoring!

## Kết Luận

Khi phát triển dự án What If Generator:

1. **Luôn nhớ đây là microservices architecture**
2. **Không tạo thêm folder backend/server**
3. **Follow service boundaries**
4. **Sử dụng đúng port numbers**
5. **Handle errors và validate input**
6. **Log important events**
7. **Test thoroughly**
8. **Follow coding standards**

Dự án này đã có structure hoàn chỉnh, chỉ cần extend và improve các services hiện có!