# What If Generator - Coding Standards

## Tổng Quan

Tài liệu này định nghĩa các tiêu chuẩn coding cho dự án **What If Generator**. Tất cả developers và AI assistants phải tuân thủ các quy tắc này để đảm bảo code quality, maintainability và consistency.

## Quy Tắc Cấu Trúc Thư Mục

### ❌ TUYỆT ĐỐI KHÔNG
1. **Tạo folder `backend`** - Đã có microservices rồi!
2. **Tạo folder `server`** - Đã có API Gateway rồi!
3. **Tạo folder `api`** - Đã có API Gateway rồi!
4. **Tạo folder `controllers`** ở root level
5. **Tạo folder `models`** ở root level
6. **Tạo folder `routes`** ở root level

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

## Naming Conventions

### 1. Files và Folders
```javascript
// ✅ Good
userController.js
authService.js
scenarioModel.js
rateLimiter.js
healthCheck.js

// ❌ Bad
UserController.js
auth_service.js
scenario-model.js
rate_limiter.js
health-check.js
```

### 2. Variables và Functions
```javascript
// ✅ Good
const generateScenario = async (topic, options) => { };
const userService = new UserService();
const isAuthenticated = true;
const maxRetries = 3;

// ❌ Bad
const GenerateScenario = async (topic, options) => { };
const user_service = new UserService();
const is_authenticated = true;
const max_retries = 3;
```

### 3. Constants
```javascript
// ✅ Good
const JWT_SECRET = process.env.JWT_SECRET;
const MAX_RETRIES = 3;
const API_BASE_URL = 'http://localhost:3000';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

// ❌ Bad
const jwtSecret = process.env.JWT_SECRET;
const maxRetries = 3;
const apiBaseUrl = 'http://localhost:3000';
const rateLimitWindow = 15 * 60 * 1000;
```

### 4. Classes
```javascript
// ✅ Good
class UserService { }
class ScenarioController { }
class AIService { }

// ❌ Bad
class userService { }
class scenario_controller { }
class AIService { }
```

### 5. Database Tables và Collections
```sql
-- ✅ Good
users
scenario_history
shared_scenarios
user_preferences

-- ❌ Bad
Users
scenarioHistory
sharedScenarios
user_preferences
```

### 6. API Endpoints
```javascript
// ✅ Good
GET /api/scenarios/my
POST /api/generate
PATCH /api/scenarios/{id}/favorite
DELETE /api/scenarios/{id}

// ❌ Bad
GET /api/scenarios/my
POST /api/generate
PATCH /api/scenarios/{id}/favorite
DELETE /api/scenarios/{id}
```

## Code Style Guidelines

### 1. JavaScript/TypeScript

#### Function Declarations
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
// ✅ Good
const processRequest = async (req, res) => {
  try {
    const result = await service.process(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Request processing failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      requestId: req.requestId
    });
  }
};

// ❌ Bad
const processRequest = async (req, res) => {
  const result = await service.process(req.body);
  res.json({ success: true, data: result });
};
```

#### Async/Await
```javascript
// ✅ Good
const getUserScenarios = async (userId, options) => {
  const scenarios = await Scenario.find({ userId });
  const total = await Scenario.countDocuments({ userId });
  return { scenarios, total };
};

// ❌ Bad
const getUserScenarios = (userId, options) => {
  return Scenario.find({ userId })
    .then(scenarios => {
      return Scenario.countDocuments({ userId })
        .then(total => ({ scenarios, total }));
    });
};
```

### 2. Database Queries

#### MongoDB (Mongoose)
```javascript
// ✅ Good
const getScenarios = async (userId, { page = 1, limit = 20, sort = 'createdAt' }) => {
  const skip = (page - 1) * limit;
  
  const [scenarios, total] = await Promise.all([
    Scenario.find({ userId, isDeleted: false })
      .sort({ [sort]: -1 })
      .limit(limit)
      .skip(skip)
      .lean(),
    Scenario.countDocuments({ userId, isDeleted: false })
  ]);
  
  return {
    scenarios,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// ❌ Bad
const getScenarios = async (userId, options) => {
  return Scenario.find({ userId });
};
```

#### PostgreSQL (Sequelize)
```javascript
// ✅ Good
const createUser = async (userData) => {
  const transaction = await sequelize.transaction();
  
  try {
    const user = await User.create(userData, { transaction });
    await user.updatePreferences(userData.preferences, { transaction });
    await transaction.commit();
    return user;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ❌ Bad
const createUser = async (userData) => {
  const user = await User.create(userData);
  return user;
};
```

### 3. API Responses

#### Success Response
```javascript
// ✅ Good
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId
  });
};

// Usage
successResponse(res, { scenario }, 'Scenario generated successfully', 201);
```

#### Error Response
```javascript
// ✅ Good
const errorResponse = (res, message, statusCode = 500, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: details,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId
  });
};

// Usage
errorResponse(res, 'Validation failed', 400, validationErrors);
```

### 4. Validation

#### Input Validation
```javascript
// ✅ Good
const validateScenarioRequest = [
  body('topic')
    .isLength({ min: 3, max: 200 })
    .withMessage('Topic must be between 3 and 200 characters')
    .trim()
    .escape(),
  body('options.promptType')
    .optional()
    .isIn(['default', 'fantasy', 'scientific', 'historical'])
    .withMessage('Invalid prompt type'),
  body('options.temperature')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Temperature must be between 0 and 1')
];

// ❌ Bad
const validateScenarioRequest = (req, res, next) => {
  if (!req.body.topic) {
    return res.status(400).json({ error: 'Topic required' });
  }
  next();
};
```

### 5. Logging

#### Structured Logging
```javascript
// ✅ Good
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

### 6. Configuration

#### Environment Variables
```javascript
// ✅ Good
const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'what_if_users',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};

// ❌ Bad
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET;
```

## Testing Standards

### 1. Unit Tests
```javascript
// ✅ Good
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
  
  describe('generateScenario', () => {
    it('should generate scenario and cache result', async () => {
      const topic = 'Test topic';
      const expectedScenario = { content: 'Generated content' };
      
      mockCache.get.mockResolvedValue(null);
      mockAIService.generate.mockResolvedValue(expectedScenario);
      
      const result = await scenarioService.generateScenario(topic);
      
      expect(result).toEqual(expectedScenario);
      expect(mockCache.set).toHaveBeenCalledWith(`scenario:${topic}`, expectedScenario, 3600);
    });
    
    it('should return cached scenario if exists', async () => {
      const topic = 'Test topic';
      const cachedScenario = { content: 'Cached content' };
      
      mockCache.get.mockResolvedValue(cachedScenario);
      
      const result = await scenarioService.generateScenario(topic);
      
      expect(result).toEqual(cachedScenario);
      expect(mockAIService.generate).not.toHaveBeenCalled();
    });
  });
});
```

### 2. Integration Tests
```javascript
// ✅ Good
describe('POST /api/generate', () => {
  let app;
  let authToken;
  
  beforeAll(async () => {
    app = await createTestApp();
    authToken = await generateTestToken({ id: 'user123' });
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  it('should generate scenario for authenticated user', async () => {
    const requestBody = {
      topic: 'Nếu như con người có thể bay',
      options: { promptType: 'fantasy' }
    };
    
    const response = await request(app)
      .post('/api/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestBody)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.scenario).toBeDefined();
    expect(response.body.data.scenario.topic).toBe(requestBody.topic);
  });
  
  it('should return 401 for unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({ topic: 'Test topic' })
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Access token required');
  });
});
```

## Security Standards

### 1. Input Sanitization
```javascript
// ✅ Good
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().escape();
  }
  return input;
};

const processUserInput = (req, res, next) => {
  req.body = sanitizeInput(req.body);
  next();
};
```

### 2. Password Security
```javascript
// ✅ Good
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};
```

### 3. JWT Security
```javascript
// ✅ Good
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'what-if-generator',
    audience: 'what-if-generator-users'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'what-if-generator',
    audience: 'what-if-generator-users'
  });
};
```

## Performance Standards

### 1. Database Optimization
```javascript
// ✅ Good
const getScenarios = async (userId, options) => {
  const query = { userId, isDeleted: false };
  
  // Use indexes
  const scenarios = await Scenario.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .skip(options.skip)
    .lean() // Use lean() for better performance
    .select('scenarioId topic content promptType tags createdAt'); // Select only needed fields
  
  return scenarios;
};
```

### 2. Caching
```javascript
// ✅ Good
const getCachedScenario = async (topic) => {
  const cacheKey = `scenario:${hashTopic(topic)}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn('Cache read failed', { error: error.message });
  }
  
  return null;
};

const setCachedScenario = async (topic, scenario, ttl = 3600) => {
  const cacheKey = `scenario:${hashTopic(topic)}`;
  
  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(scenario));
  } catch (error) {
    logger.warn('Cache write failed', { error: error.message });
  }
};
```

### 3. Error Handling
```javascript
// ✅ Good
const handleServiceError = (error, serviceName) => {
  logger.error(`${serviceName} error`, {
    error: error.message,
    stack: error.stack,
    service: serviceName
  });
  
  if (error.code === 'ECONNREFUSED') {
    throw new ServiceUnavailableError(`${serviceName} is unavailable`);
  }
  
  throw new InternalServerError('An unexpected error occurred');
};
```

## Documentation Standards

### 1. JSDoc Comments
```javascript
/**
 * Generates a scenario based on the given topic and options
 * @param {string} topic - The topic for scenario generation
 * @param {Object} options - Generation options
 * @param {string} options.promptType - Type of prompt to use
 * @param {number} options.temperature - AI temperature (0-1)
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @returns {Promise<Object>} Generated scenario object
 * @throws {ValidationError} When topic is invalid
 * @throws {AIServiceError} When AI generation fails
 */
const generateScenario = async (topic, options = {}) => {
  // Implementation
};
```

### 2. API Documentation
```javascript
/**
 * @swagger
 * /api/generate:
 *   post:
 *     summary: Generate a new scenario
 *     tags: [Generation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: "Nếu như con người có thể bay"
 *               options:
 *                 type: object
 *                 properties:
 *                   promptType:
 *                     type: string
 *                     enum: [default, fantasy, scientific, historical]
 *                   temperature:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *     responses:
 *       200:
 *         description: Scenario generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     scenario:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
```

## Git Standards

### 1. Commit Messages
```
feat: add scenario generation endpoint
fix: resolve JWT token validation issue
docs: update API documentation
refactor: improve error handling in user service
test: add unit tests for generation service
chore: update dependencies
```

### 2. Branch Naming
```
feature/UC-001-scenario-generation
bugfix/fix-login-validation
hotfix/security-patch
release/v1.2.0
```

### 3. Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

## Code Review Standards

### 1. Review Checklist
- [ ] Code follows naming conventions
- [ ] Error handling is proper
- [ ] Input validation is implemented
- [ ] Security best practices followed
- [ ] Performance considerations addressed
- [ ] Tests are comprehensive
- [ ] Documentation is updated
- [ ] No hardcoded values
- [ ] Proper logging implemented

### 2. Review Comments
```javascript
// ✅ Good review comment
// Consider adding input validation for the topic parameter
// to prevent potential XSS attacks

// ❌ Bad review comment
// This is wrong
```

## Common Anti-patterns to Avoid

### 1. ❌ Don't Do This
```javascript
// Hardcoded values
const maxRetries = 3;
const timeout = 5000;

// No error handling
const result = await service.process();

// No validation
const processData = (data) => {
  return data.value * 2;
};

// No logging
const saveUser = async (user) => {
  await User.create(user);
};

// No caching
const getData = async (id) => {
  return await Database.findById(id);
};
```

### 2. ✅ Do This Instead
```javascript
// Use configuration
const maxRetries = config.maxRetries || 3;
const timeout = config.timeout || 5000;

// Proper error handling
try {
  const result = await service.process();
  return result;
} catch (error) {
  logger.error('Processing failed', { error: error.message });
  throw new ProcessingError('Failed to process data');
}

// Input validation
const processData = (data) => {
  if (!data || typeof data.value !== 'number') {
    throw new ValidationError('Invalid data provided');
  }
  return data.value * 2;
};

// Proper logging
const saveUser = async (user) => {
  try {
    const savedUser = await User.create(user);
    logger.info('User saved successfully', { userId: savedUser.id });
    return savedUser;
  } catch (error) {
    logger.error('Failed to save user', { error: error.message });
    throw error;
  }
};

// Implement caching
const getData = async (id) => {
  const cacheKey = `data:${id}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await Database.findById(id);
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
  return data;
};
```

## Kết Luận

Những tiêu chuẩn này đảm bảo:

- ✅ **Consistency**: Code style nhất quán across services
- ✅ **Maintainability**: Dễ maintain và debug
- ✅ **Security**: Best practices cho security
- ✅ **Performance**: Optimized cho production
- ✅ **Quality**: High code quality với testing
- ✅ **Documentation**: Comprehensive documentation

**Lưu ý quan trọng**: KHÔNG BAO GIỜ tạo thêm folder `backend` - hệ thống đã sử dụng microservices architecture!