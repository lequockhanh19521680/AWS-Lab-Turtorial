# What If Generator - Social Media Platform

## 🚀 Tổng Quan

What If Generator là một nền tảng social media cho phép người dùng tạo và chia sẻ các viễn cảnh "Nếu như..." thú vị sử dụng AI, với hệ thống thành tựu, tương tác xã hội và đăng nhập OAuth.

## 🏗️ Kiến Trúc

### Microservices Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │   Databases     │
│   (React)       │◄──►│   (Port 3000)   │◄──►│ PostgreSQL +    │
│   Port 3005     │    │                 │    │ MongoDB + Redis │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼────┐ ┌────▼────┐ ┌───▼────┐
            │ User Svc   │ │Gen Svc  │ │Social  │
            │ (3001)     │ │(3002)   │ │(3006)  │
            │ OAuth      │ │AI Gen   │ │Posts   │
            └────────────┘ └─────────┘ └────────┘
                    │           │           │
            ┌───────▼────┐ ┌────▼────┐ ┌───▼────┐
            │History Svc │ │Sharing  │ │Video   │
            │(3003)      │ │(3004)   │ │(3005)  │
            │Scenarios   │ │Reports  │ │Gen     │
            └────────────┘ └─────────┘ └────────┘
```

### Services Overview
| Service | Port | Database | Chức Năng |
|---------|------|----------|-----------|
| **API Gateway** | 3000 | Redis | Routing, Auth, Rate Limiting |
| **User Service** | 3001 | PostgreSQL | User Management, OAuth |
| **Generation Service** | 3002 | Redis | AI Scenario Generation |
| **History Service** | 3003 | MongoDB | Scenario History |
| **Sharing Service** | 3004 | MongoDB | Sharing & Reports |
| **Video Service** | 3005 | Redis | Video Generation |
| **Social Service** | 3006 | MongoDB | Social Media Features |
| **Frontend** | 3005 | - | React UI |

## ✨ Tính Năng Chính

### 🎯 AI Scenario Generation
- Tạo viễn cảnh "Nếu như..." bằng AI
- Nhiều loại prompt (fantasy, historical, scientific)
- Hỗ trợ multiple AI providers (Gemini, OpenAI, Anthropic)

### 🏆 Achievement System
- **Categories**: Creation, Interaction, Social, Milestone, Special
- **Rarities**: Common → Uncommon → Rare → Epic → Legendary
- **Auto-tracking**: Tự động theo dõi progress
- **Leaderboards**: Bảng xếp hạng toàn cầu

### 📱 Social Media Features
- **Posts**: Chia sẻ thành tựu, viễn cảnh, milestones
- **Comments**: Bình luận với hình ảnh
- **Likes/Shares**: Tương tác cơ bản
- **Feed**: Timeline cá nhân và công khai
- **User Profiles**: Stats, achievements, activity

### 🔐 OAuth Integration
- **Google OAuth**: Đăng nhập bằng Google
- **Facebook OAuth**: Đăng nhập bằng Facebook
- **Account Linking**: Liên kết nhiều tài khoản

### 🎥 Video Generation
- Tạo video từ viễn cảnh
- Text-to-Speech
- Multiple video providers

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)

### 1. Clone & Setup
```bash
git clone <repository-url>
cd what-if-generator

# Copy environment files
cp services/user-service/.env.example services/user-service/.env
cp services/generation-service/.env.example services/generation-service/.env
cp services/social-service/.env.example services/social-service/.env
```

### 2. Configure API Keys
```bash
# services/generation-service/.env
GEMINI_API_KEY=your-gemini-api-key

# services/user-service/.env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# services/social-service/.env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/what_if_social?authSource=admin
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f social-service
```

### 4. Access URLs
- **Frontend**: http://localhost:3005
- **API Gateway**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 📚 API Documentation

### Social Media Endpoints
```bash
# Posts
POST   /api/social/posts              # Tạo post mới
GET    /api/social/posts/feed         # Lấy feed công khai
GET    /api/social/posts/user/:userId # Lấy posts của user
POST   /api/social/posts/:postId/like # Like/unlike post

# Comments
POST   /api/social/comments           # Tạo comment mới
GET    /api/social/comments/post/:postId # Lấy comments của post

# Achievements
GET    /api/achievements              # Lấy danh sách achievements
GET    /api/achievements/user/:userId # Lấy achievements của user
GET    /api/achievements/leaderboard/top # Bảng xếp hạng

# OAuth
GET    /api/auth/google               # Google OAuth login
GET    /api/auth/facebook             # Facebook OAuth login
```

### Example API Calls
```javascript
// Tạo post mới
const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Tôi đã tạo viễn cảnh đầu tiên!',
    content: 'Viễn cảnh về thế giới không có Internet...',
    type: 'scenario',
    tags: ['viễn cảnh', 'công nghệ'],
    visibility: 'public'
  })
});

// Like một post
await fetch(`/api/social/posts/${postId}/like`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🗄️ Database Schema

### Social Media Collections (MongoDB)
```javascript
// Achievements
{
  achievementId: "first_scenario",
  name: "First Steps",
  description: "Tạo viễn cảnh đầu tiên của bạn",
  category: "creation",
  icon: "🌟",
  points: 10,
  rarity: "common"
}

// Posts
{
  postId: "post_123",
  userId: "user_456",
  title: "Tôi đã tạo viễn cảnh đầu tiên!",
  content: "Viễn cảnh về thế giới không có Internet...",
  type: "scenario",
  likes: { count: 5, users: [...] },
  shares: { count: 2, users: [...] }
}

// User Profiles
{
  userId: "user_456",
  username: "john_doe",
  displayName: "John Doe",
  stats: {
    followers: 100,
    following: 50,
    reputation: 250,
    level: 5,
    experience: 1250
  },
  badges: [...]
}
```

### User Extensions (PostgreSQL)
```sql
-- OAuth fields
google_id VARCHAR UNIQUE,
facebook_id VARCHAR UNIQUE,
provider VARCHAR DEFAULT 'local',

-- Social fields
username VARCHAR(30) UNIQUE,
display_name VARCHAR(50),
bio TEXT,
avatar VARCHAR,

-- Stats
followers INTEGER DEFAULT 0,
reputation INTEGER DEFAULT 0,
level INTEGER DEFAULT 1,
experience INTEGER DEFAULT 0
```

## 🔧 Development

### Project Structure
```
what-if-generator/
├── api-gateway/              # API Gateway service
├── services/
│   ├── user-service/         # User management + OAuth
│   ├── generation-service/   # AI scenario generation
│   ├── history-service/      # Scenario history
│   ├── sharing-service/      # Sharing & reports
│   ├── video-service/        # Video generation
│   └── social-service/       # Social media features
├── frontend/                 # React frontend
├── docker/                   # Docker configurations
├── docs/                     # Documentation
└── docker-compose.yml        # Development environment
```

### Adding New Features

#### 1. Thêm Achievement Mới
```javascript
// Trong social service
const achievement = new Achievement({
  achievementId: 'new_achievement',
  name: 'New Achievement',
  description: 'Description here',
  category: 'creation',
  points: 50,
  rarity: 'rare'
});
```

#### 2. Thêm API Endpoint Mới
```javascript
// Trong social service routes
router.get('/api/new-endpoint', authMiddleware, async (req, res) => {
  // Implementation
});

// Cập nhật API Gateway routing
'/api/new-endpoint': { service: 'social', target: '/api/new-endpoint' }
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Health checks
curl http://localhost:3000/health
curl http://localhost:3006/health
```

## 📊 Monitoring

### Health Checks
```bash
# All services
curl http://localhost:3000/health

# Individual services
curl http://localhost:3001/health  # User Service
curl http://localhost:3006/health  # Social Service
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f social-service
```

## 🚀 Production Deployment

### Environment Variables
```env
# Production settings
NODE_ENV=production
JWT_SECRET=your-very-long-secure-secret
MONGODB_URI=mongodb://prod-user:secure-pass@mongodb:27017/what_if_social?authSource=admin

# OAuth (Production)
GOOGLE_CLIENT_ID=your-prod-google-client-id
GOOGLE_CLIENT_SECRET=your-prod-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

FACEBOOK_APP_ID=your-prod-facebook-app-id
FACEBOOK_APP_SECRET=your-prod-facebook-app-secret
FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/auth/facebook/callback
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n what-if-generator
kubectl get services -n what-if-generator
```

## 🛠️ Troubleshooting

### Common Issues

1. **Services không start được**
   ```bash
   docker-compose logs [service-name]
   ```

2. **Database connection failed**
   ```bash
   docker-compose ps
   docker exec -it what-if-mongodb mongosh
   ```

3. **OAuth login fails**
   - Check OAuth app configuration
   - Verify callback URLs
   - Check environment variables

### Debug Commands
```bash
# Enter container
docker exec -it [container-name] /bin/sh

# Check database
docker exec -it what-if-mongodb mongosh
docker exec -it what-if-postgres psql -U postgres -d what_if_users

# Check Redis
docker exec -it what-if-redis redis-cli ping
```

## 📖 Documentation

- **Social Media Guide**: [SOCIAL_MEDIA_GUIDE.md](./SOCIAL_MEDIA_GUIDE.md)
- **API Documentation**: http://localhost:3000/api-docs
- **Development Guide**: [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md)
- **Deployment Guide**: [what-if-generator/docs/DEPLOYMENT_GUIDE.md](./what-if-generator/docs/DEPLOYMENT_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/what-if-generator/issues)
- **Documentation**: [GitHub Wiki](https://github.com/your-org/what-if-generator/wiki)
- **Email**: support@whatifgenerator.com

---

**What If Generator** - Tạo ra những viễn cảnh thú vị và kết nối cộng đồng! 🌟