# What If Generator - Technical Specifications

## Tổng Quan Kỹ Thuật

**What If Generator** là một hệ thống microservices được thiết kế để tạo ra các viễn cảnh "Nếu như..." sử dụng trí tuệ nhân tạo. Hệ thống được xây dựng với kiến trúc microservices, sử dụng Node.js, React, và các database khác nhau.

## Kiến Trúc Chi Tiết

### 1. API Gateway (Port 3000)

#### Chức Năng
- **Central Entry Point**: Điểm vào duy nhất cho tất cả requests
- **Request Routing**: Route requests đến các microservices
- **Authentication**: JWT token validation
- **Rate Limiting**: Giới hạn số lượng requests
- **Load Balancing**: Phân tải requests
- **Health Monitoring**: Monitor health của các services

#### Technology Stack
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "authentication": "JWT + express-jwt",
  "rateLimiting": "express-rate-limit + Redis",
  "proxy": "http-proxy-middleware",
  "logging": "Winston",
  "caching": "Redis"
}
```

#### Cấu Trúc Code
```
api-gateway/
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   ├── logger.js         # Winston logging config
│   │   ├── redis.js          # Redis connection
│   │   └── services.js       # Service URLs mapping
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   ├── proxy.js          # Request proxying middleware
│   │   └── rateLimiter.js    # Rate limiting middleware
│   ├── routes/
│   │   └── health.js         # Health check routes
│   └── services/
│       └── healthCheck.js    # Health check service
├── Dockerfile
└── package.json
```

#### API Endpoints
```javascript
// Health Check
GET /health
GET /health/services
GET /health/services/{serviceName}

// Service Routing
POST /api/auth/* → user-service:3001
POST /api/generate → generation-service:3002
GET /api/scenarios/* → history-service:3003
POST /api/share/* → sharing-service:3004
POST /api/video/* → video-service:3005
```

#### Rate Limiting Configuration
```javascript
const rateLimits = {
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP'
  },
  authenticated: {
    windowMs: 15 * 60 * 1000,
    max: 1000, // 1000 requests per window
    message: 'Too many requests from this user'
  },
  generation: {
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 generation requests per window
    message: 'Generation rate limit exceeded'
  }
};
```

### 2. User Service (Port 3001)

#### Chức Năng
- **User Registration**: Đăng ký tài khoản mới
- **Authentication**: Đăng nhập/đăng xuất
- **Profile Management**: Quản lý thông tin cá nhân
- **Password Management**: Đổi mật khẩu, reset password
- **Email Verification**: Xác thực email
- **Account Management**: Xóa tài khoản, cập nhật preferences

#### Technology Stack
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "database": "PostgreSQL 15+",
  "orm": "Sequelize",
  "authentication": "JWT + bcrypt",
  "email": "Nodemailer",
  "validation": "express-validator",
  "caching": "Redis"
}
```

#### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  preferences JSONB DEFAULT '{}',
  login_attempts INTEGER DEFAULT 0,
  lock_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### API Endpoints
```javascript
// Authentication
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password

// User Management
GET /users/profile
PUT /users/profile
PUT /users/change-password
PUT /users/change-email
DELETE /users/account
```

#### Security Features
```javascript
// Password hashing
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Account lockout
const maxLoginAttempts = 5;
const lockTime = 2 * 60 * 60 * 1000; // 2 hours

// JWT token generation
const tokenPayload = {
  id: user.id,
  email: user.email,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};
```

### 3. Generation Service (Port 3002)

#### Chức Năng
- **AI Scenario Generation**: Tạo viễn cảnh từ chủ đề
- **Multiple AI Providers**: Hỗ trợ nhiều AI providers
- **Content Filtering**: Lọc nội dung không phù hợp
- **Response Caching**: Cache responses để tối ưu performance
- **Prompt Engineering**: Tối ưu prompts cho từng loại viễn cảnh

#### Technology Stack
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "aiProviders": ["Google Gemini", "OpenAI", "Anthropic"],
  "caching": "Redis",
  "validation": "Joi",
  "logging": "Winston"
}
```

#### AI Providers Configuration
```javascript
const aiProviders = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-pro',
    maxTokens: 1000,
    temperature: 0.8
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.8
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet',
    maxTokens: 1000,
    temperature: 0.8
  }
};
```

#### Prompt Types
```javascript
const promptTypes = {
  default: {
    systemPrompt: "Bạn là một nhà văn sáng tạo chuyên tạo ra các viễn cảnh 'Nếu như...' thú vị và hấp dẫn.",
    userPromptTemplate: "Hãy tạo một viễn cảnh chi tiết về: {topic}"
  },
  fantasy: {
    systemPrompt: "Bạn là một nhà văn fantasy chuyên tạo ra các viễn cảnh thần thoại và kỳ ảo.",
    userPromptTemplate: "Tạo một viễn cảnh fantasy về: {topic}"
  },
  scientific: {
    systemPrompt: "Bạn là một nhà khoa học chuyên tạo ra các viễn cảnh dựa trên khoa học thực tế.",
    userPromptTemplate: "Tạo một viễn cảnh khoa học về: {topic}"
  },
  historical: {
    systemPrompt: "Bạn là một nhà sử học chuyên tạo ra các viễn cảnh lịch sử thay thế.",
    userPromptTemplate: "Tạo một viễn cảnh lịch sử thay thế về: {topic}"
  }
};
```

#### API Endpoints
```javascript
// Generation
POST /generate
GET /random
POST /regenerate
POST /batch-generate

// Provider Management
GET /providers
POST /providers/{provider}/test
```

#### Caching Strategy
```javascript
const cacheStrategy = {
  // Cache generated scenarios
  scenarioCache: {
    key: 'scenario:{topicHash}',
    ttl: 3600, // 1 hour
    condition: 'ifNotExists'
  },
  // Cache provider responses
  providerCache: {
    key: 'provider:{provider}:{requestHash}',
    ttl: 1800, // 30 minutes
    condition: 'always'
  }
};
```

### 4. History Service (Port 3003)

#### Chức Năng
- **Scenario Storage**: Lưu trữ lịch sử viễn cảnh
- **Search & Filter**: Tìm kiếm và lọc scenarios
- **Tagging System**: Hệ thống gắn thẻ
- **Analytics**: Thống kê và phân tích
- **Favorites**: Hệ thống yêu thích

#### Technology Stack
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "database": "MongoDB 7+",
  "odm": "Mongoose",
  "search": "MongoDB Text Search",
  "caching": "Redis",
  "validation": "Joi"
}
```

#### Database Schema
```javascript
const scenarioSchema = new mongoose.Schema({
  scenarioId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true, 
    index: true
  },
  topic: { 
    type: String, 
    required: true, 
    maxlength: 200,
    index: true
  },
  content: { 
    type: String, 
    required: true
  },
  promptType: { 
    type: String, 
    enum: ['default', 'fantasy', 'scientific', 'historical'],
    default: 'default',
    index: true
  },
  tags: [{ 
    type: String, 
    maxlength: 30,
    index: true
  }],
  isFavorite: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isPublic: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isDeleted: { 
    type: Boolean, 
    default: false,
    index: true
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5,
    index: true
  },
  viewCount: { 
    type: Number, 
    default: 0,
    index: true
  },
  shareCount: { 
    type: Number, 
    default: 0,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now
  }
});

// Compound indexes
scenarioSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
scenarioSchema.index({ userId: 1, isFavorite: 1, createdAt: -1 });
scenarioSchema.index({ userId: 1, promptType: 1, createdAt: -1 });
scenarioSchema.index({ topic: 'text', content: 'text', tags: 'text' });
```

#### API Endpoints
```javascript
// Scenario Management
GET /scenarios/my
GET /scenarios/search
GET /scenarios/{scenarioId}
PATCH /scenarios/{scenarioId}
DELETE /scenarios/{scenarioId}
PATCH /scenarios/bulk

// Analytics
GET /scenarios/stats
GET /scenarios/analytics
```

#### Search Implementation
```javascript
const searchScenarios = async (userId, searchParams) => {
  const {
    q, // search query
    tags, // comma-separated tags
    promptType,
    isFavorite,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc'
  } = searchParams;
  
  let query = { userId, isDeleted: false };
  
  // Text search
  if (q) {
    query.$or = [
      { topic: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { tags: { $in: [new RegExp(q, 'i')] } }
    ];
  }
  
  // Filter by tags
  if (tags) {
    query.tags = { $in: tags.split(',') };
  }
  
  // Filter by prompt type
  if (promptType) {
    query.promptType = promptType;
  }
  
  // Filter by favorite
  if (isFavorite !== undefined) {
    query.isFavorite = isFavorite === 'true';
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  
  const scenarios = await Scenario.find(query)
    .sort({ [sort]: order === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean();
  
  const total = await Scenario.countDocuments(query);
  
  return {
    scenarios,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};
```

### 5. Sharing Service (Port 3004)

#### Chức Năng
- **Scenario Sharing**: Chia sẻ scenarios với unique URLs
- **QR Code Generation**: Tạo QR codes cho sharing
- **Social Media Integration**: Tích hợp với các platform xã hội
- **Content Moderation**: Kiểm duyệt nội dung
- **Analytics**: Thống kê sharing và views
- **Reporting System**: Hệ thống báo cáo nội dung

#### Technology Stack
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "database": "MongoDB 7+",
  "odm": "Mongoose",
  "qrGeneration": "qrcode",
  "urlShortening": "Custom implementation",
  "caching": "Redis",
  "validation": "Joi"
}
```

#### Database Schema
```javascript
const sharedScenarioSchema = new mongoose.Schema({
  scenarioId: { 
    type: String, 
    required: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  shareUrl: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  shortUrl: { 
    type: String,
    index: true
  },
  title: { 
    type: String, 
    maxlength: 200
  },
  description: { 
    type: String, 
    maxlength: 500
  },
  scenarioData: { 
    type: Object, 
    required: true
  },
  isPasswordProtected: { 
    type: Boolean, 
    default: false
  },
  password: { 
    type: String
  },
  expiresAt: { 
    type: Date,
    index: true
  },
  viewCount: { 
    type: Number, 
    default: 0,
    index: true
  },
  shareCount: { 
    type: Number, 
    default: 0,
    index: true
  },
  sharesByPlatform: { 
    type: Map, 
    of: Number
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  isHidden: { 
    type: Boolean, 
    default: false,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

const reportSchema = new mongoose.Schema({
  targetType: { 
    type: String, 
    enum: ['shared_scenario', 'user', 'comment'],
    required: true,
    index: true
  },
  targetId: { 
    type: String, 
    required: true,
    index: true
  },
  reporterId: { 
    type: String,
    index: true
  },
  reporterIP: { 
    type: String,
    index: true
  },
  reason: { 
    type: String, 
    enum: [
      'inappropriate_content',
      'spam',
      'harassment',
      'violence',
      'hate_speech',
      'adult_content',
      'misinformation',
      'copyright_violation',
      'other'
    ],
    required: true,
    index: true
  },
  description: { 
    type: String, 
    maxlength: 1000
  },
  category: { 
    type: String, 
    enum: ['content', 'behavior', 'technical', 'legal'],
    required: true
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  priorityScore: { 
    type: Number, 
    default: 0,
    index: true
  },
  autoModerationScore: { 
    type: Number, 
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});
```

#### API Endpoints
```javascript
// Sharing
POST /share/{scenarioId}
GET /shared/{shareUrl}
GET /sharing/my
PATCH /sharing/share/{shareUrl}
DELETE /sharing/share/{shareUrl}
POST /sharing/share/{shareUrl}/record

// QR Codes
GET /qr/{shareUrl}

// Analytics
GET /sharing/analytics

// Reporting
POST /report
GET /reporting/options
```

#### QR Code Generation
```javascript
const generateQRCode = async (shareUrl) => {
  const qrCodeDataUrl = await QRCode.toDataURL(
    `${process.env.FRONTEND_URL}/shared/${shareUrl}`,
    {
      width: 200,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }
  );
  
  return qrCodeDataUrl;
};
```

### 6. Video Service (Port 3005)

#### Chức Năng
- **Video Generation**: Tạo video từ scenarios
- **Text-to-Speech**: Chuyển đổi text thành giọng nói
- **Multiple Video Providers**: Hỗ trợ nhiều video providers
- **File Management**: Quản lý files video
- **Video Processing**: Xử lý và tối ưu video

#### Technology Stack
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "videoProviders": ["Runway ML", "Pika Labs", "Stability AI"],
  "tts": "Google Cloud TTS",
  "fileStorage": "Local + Cloud Storage",
  "caching": "Redis",
  "validation": "Joi"
}
```

#### Video Providers Configuration
```javascript
const videoProviders = {
  runway: {
    apiKey: process.env.RUNWAY_API_KEY,
    model: 'gen-2',
    maxDuration: 60, // seconds
    resolution: '1280x720'
  },
  pika: {
    apiKey: process.env.PIKA_API_KEY,
    model: 'pika-1.0',
    maxDuration: 30,
    resolution: '1024x576'
  },
  stability: {
    apiKey: process.env.STABILITY_API_KEY,
    model: 'stable-video-diffusion',
    maxDuration: 25,
    resolution: '1024x1024'
  }
};
```

#### API Endpoints
```javascript
// Video Generation
POST /video/generate
GET /video/{videoId}/status
GET /video/{videoId}/download
DELETE /video/{videoId}

// TTS
POST /video/tts
GET /video/tts/{audioId}

// File Management
POST /video/upload
GET /video/files
DELETE /video/files/{fileId}
```

### 7. Frontend (React + Next.js)

#### Chức Năng
- **User Interface**: Giao diện người dùng
- **State Management**: Quản lý state với React Query
- **Authentication**: Xử lý đăng nhập/đăng ký
- **Scenario Generation**: Giao diện tạo viễn cảnh
- **History Management**: Quản lý lịch sử
- **Sharing Interface**: Giao diện chia sẻ

#### Technology Stack
```javascript
{
  "framework": "Next.js 14+",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "stateManagement": "React Query + Context API",
  "httpClient": "Axios",
  "uiComponents": "Custom + Headless UI",
  "buildTool": "Vite"
}
```

#### Component Structure
```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── login/             # Login page
│   ├── register/          # Register page
│   ├── history/           # History page
│   └── shared/            # Shared scenario page
├── components/            # React components
│   ├── Header.tsx         # Header component
│   ├── ScenarioGenerator.tsx # Main generator
│   ├── ScenarioCard.tsx   # Scenario card
│   ├── SearchBar.tsx      # Search interface
│   ├── TagInput.tsx       # Tag input
│   ├── ShareModal.tsx     # Share modal
│   └── ui/                # UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   ├── utils.ts          # Helper functions
│   └── auth.ts           # Auth utilities
├── services/             # Service layer
│   └── api.ts            # API service
├── types/                # TypeScript types
│   └── index.ts          # Type definitions
└── styles/               # Styling
    └── globals.css       # Global styles
```

#### State Management
```typescript
// API Client
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// React Query hooks
export const useScenarios = (params: SearchParams) => {
  return useQuery({
    queryKey: ['scenarios', params],
    queryFn: () => apiClient.get('/scenarios/my', { params }),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useGenerateScenario = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: GenerateRequest) => 
      apiClient.post('/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scenarios']);
    }
  });
};
```

## Database Architecture

### PostgreSQL (User Service)
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  preferences JSONB DEFAULT '{}',
  login_attempts INTEGER DEFAULT 0,
  lock_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### MongoDB (History Service)
```javascript
// Scenarios collection
{
  scenarioId: String, // unique identifier
  userId: String, // user who created it
  topic: String, // scenario topic
  content: String, // generated content
  promptType: String, // type of prompt used
  tags: [String], // user-defined tags
  isFavorite: Boolean, // user favorite
  isPublic: Boolean, // public visibility
  isDeleted: Boolean, // soft delete
  rating: Number, // user rating 1-5
  viewCount: Number, // view count
  shareCount: Number, // share count
  createdAt: Date, // creation timestamp
  updatedAt: Date // last update timestamp
}
```

### MongoDB (Sharing Service)
```javascript
// Shared scenarios collection
{
  scenarioId: String, // original scenario ID
  userId: String, // user who shared it
  shareUrl: String, // unique share URL
  shortUrl: String, // shortened URL
  title: String, // share title
  description: String, // share description
  scenarioData: Object, // scenario data snapshot
  isPasswordProtected: Boolean, // password protection
  password: String, // protection password
  expiresAt: Date, // expiration date
  viewCount: Number, // view count
  shareCount: Number, // share count
  sharesByPlatform: Map, // platform-specific shares
  isActive: Boolean, // active status
  isHidden: Boolean, // hidden status
  createdAt: Date // creation timestamp
}

// Reports collection
{
  targetType: String, // type of reported content
  targetId: String, // ID of reported content
  reporterId: String, // reporter user ID
  reporterIP: String, // reporter IP address
  reason: String, // reason for report
  description: String, // detailed description
  category: String, // report category
  severity: String, // severity level
  status: String, // report status
  priorityScore: Number, // priority score
  autoModerationScore: Number, // auto-moderation score
  createdAt: Date // creation timestamp
}
```

### Redis (Caching)
```javascript
// Cache keys structure
{
  // User sessions
  "session:{userId}": "session_data",
  
  // Generated scenarios
  "scenario:{topicHash}": "scenario_data",
  
  // API responses
  "api:{endpoint}:{paramsHash}": "response_data",
  
  // Rate limiting
  "rate_limit:{identifier}": "request_count",
  
  // Health checks
  "health:{service}": "health_status"
}
```

## Security Architecture

### Authentication Flow
```javascript
// JWT Token Structure
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "user_uuid",
    "email": "user@example.com",
    "iat": 1640995200,
    "exp": 1641081600,
    "iss": "what-if-generator",
    "aud": "what-if-generator-users"
  },
  "signature": "HMACSHA256(base64UrlEncode(header) + '.' + base64UrlEncode(payload), secret)"
}
```

### Rate Limiting Strategy
```javascript
const rateLimits = {
  // API Gateway level
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP'
  },
  authenticated: {
    windowMs: 15 * 60 * 1000,
    max: 1000, // 1000 requests per window
    message: 'Too many requests from this user'
  },
  
  // Service level
  generation: {
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 generation requests per window
    message: 'Generation rate limit exceeded'
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 auth requests per window
    message: 'Authentication rate limit exceeded'
  }
};
```

### Input Validation
```javascript
// Validation schemas
const validationSchemas = {
  generateScenario: {
    topic: {
      type: 'string',
      minLength: 3,
      maxLength: 200,
      required: true
    },
    options: {
      type: 'object',
      properties: {
        promptType: {
          type: 'string',
          enum: ['default', 'fantasy', 'scientific', 'historical']
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 1
        },
        maxTokens: {
          type: 'number',
          minimum: 100,
          maximum: 2000
        }
      }
    }
  },
  
  userRegistration: {
    email: {
      type: 'string',
      format: 'email',
      required: true
    },
    password: {
      type: 'string',
      minLength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$',
      required: true
    },
    firstName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      required: true
    },
    lastName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      required: true
    }
  }
};
```

## Performance Optimization

### Caching Strategy
```javascript
const cachingStrategy = {
  // Redis caching
  redis: {
    // Generated scenarios
    scenarios: {
      key: 'scenario:{topicHash}',
      ttl: 3600, // 1 hour
      condition: 'ifNotExists'
    },
    
    // API responses
    apiResponses: {
      key: 'api:{endpoint}:{paramsHash}',
      ttl: 1800, // 30 minutes
      condition: 'always'
    },
    
    // User sessions
    sessions: {
      key: 'session:{userId}',
      ttl: 86400, // 24 hours
      condition: 'always'
    }
  },
  
  // Database query optimization
  database: {
    // Use indexes
    indexes: [
      'userId',
      'isDeleted',
      'createdAt',
      'isFavorite',
      'promptType'
    ],
    
    // Use lean queries
    lean: true,
    
    // Use aggregation pipelines
    aggregation: true
  }
};
```

### Database Optimization
```javascript
// MongoDB optimization
const optimizationStrategies = {
  // Indexes
  indexes: [
    { userId: 1, isDeleted: 1, createdAt: -1 },
    { userId: 1, isFavorite: 1, createdAt: -1 },
    { userId: 1, promptType: 1, createdAt: -1 },
    { topic: 'text', content: 'text', tags: 'text' }
  ],
  
  // Query optimization
  queries: {
    // Use lean() for better performance
    lean: true,
    
    // Use select() to limit fields
    select: 'scenarioId topic content promptType tags isFavorite createdAt',
    
    // Use pagination
    pagination: {
      limit: 20,
      skip: 0
    }
  },
  
  // Aggregation pipelines
  aggregation: {
    // Popular tags
    popularTags: [
      { $match: { userId, isDeleted: false } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]
  }
};
```

## Monitoring và Observability

### Health Checks
```javascript
const healthCheck = {
  // Service health
  service: {
    status: 'healthy|unhealthy',
    timestamp: '2024-01-01T12:00:00Z',
    uptime: 3600,
    checks: {
      database: 'connected|disconnected',
      redis: 'connected|disconnected',
      external_apis: 'responding|not_responding'
    }
  },
  
  // System metrics
  metrics: {
    cpu_usage: '75%',
    memory_usage: '512MB',
    disk_usage: '2.1GB',
    network_io: '1.2MB/s'
  },
  
  // Business metrics
  business: {
    total_scenarios: 1250,
    active_users: 150,
    requests_per_minute: 45,
    error_rate: '0.1%'
  }
};
```

### Logging Strategy
```javascript
const loggingStrategy = {
  // Log levels
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  
  // Log formats
  formats: {
    development: 'winston.format.combine(winston.format.colorize(), winston.format.simple())',
    production: 'winston.format.combine(winston.format.timestamp(), winston.format.json())'
  },
  
  // Log transports
  transports: [
    'console',
    'file',
    'database',
    'external_service'
  ]
};
```

## Deployment Architecture

### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
EXPOSE 3000
CMD ["node", "src/index.js"]
```

### Kubernetes Configuration
```yaml
# Deployment
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
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Kết Luận

Hệ thống What If Generator được thiết kế với:

- ✅ **Microservices Architecture**: 5 services độc lập
- ✅ **Scalable**: Có thể scale từng service riêng biệt
- ✅ **Secure**: JWT authentication, rate limiting, input validation
- ✅ **Performant**: Redis caching, database optimization
- ✅ **Maintainable**: Clean code structure, comprehensive logging
- ✅ **Observable**: Health checks, metrics, monitoring
- ✅ **Deployable**: Docker + Kubernetes ready

Hệ thống sẵn sàng cho production với khả năng mở rộng và maintain dài hạn.