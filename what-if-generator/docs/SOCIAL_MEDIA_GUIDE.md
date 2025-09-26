# What If Generator - Social Media Platform

## Tổng Quan

What If Generator Social Media Platform là một hệ thống microservices mở rộng cho phép người dùng tương tác xã hội, chia sẻ thành tựu và tạo ra cộng đồng xung quanh việc tạo viễn cảnh "Nếu như...".

## Kiến Trúc Mở Rộng

### Services Overview
1. **API Gateway** (Port 3000) - Entry point, routing, auth
2. **User Service** (Port 3001) - User management, OAuth authentication
3. **Generation Service** (Port 3002) - AI scenario generation
4. **History Service** (Port 3003) - Scenario history management
5. **Sharing Service** (Port 3004) - Sharing and reporting
6. **Video Service** (Port 3005) - Video generation
7. **Social Service** (Port 3006) - **MỚI** - Social media features
8. **Frontend** (Port 3005) - React application

### Database Architecture
- **PostgreSQL**: User data với social fields mới
- **MongoDB**: 
  - History data (History Service)
  - Sharing data (Sharing Service)  
  - **Social data (Social Service)** - MỚI
- **Redis**: Caching và session management

## Social Media Features

### 🏆 Achievement System
- **Categories**: Creation, Interaction, Social, Milestone, Special
- **Rarities**: Common, Uncommon, Rare, Epic, Legendary
- **Auto-tracking**: Tự động theo dõi progress
- **Leaderboards**: Bảng xếp hạng toàn cầu

### 📱 Social Interactions
- **Posts**: Chia sẻ thành tựu, viễn cảnh, milestones
- **Comments**: Bình luận với hình ảnh
- **Likes/Shares**: Tương tác cơ bản
- **Feed**: Timeline cá nhân và công khai

### 👤 User Profiles
- **Social Stats**: Followers, following, reputation, level
- **Achievements**: Badges và progress tracking
- **Activity Feed**: Lịch sử hoạt động
- **Public/Private**: Tùy chọn hiển thị

### 🔐 OAuth Integration
- **Google OAuth**: Đăng nhập bằng Google
- **Facebook OAuth**: Đăng nhập bằng Facebook
- **Account Linking**: Liên kết nhiều tài khoản
- **Profile Sync**: Đồng bộ thông tin cơ bản

## API Endpoints

### Social Media Endpoints

#### Posts
```
POST   /api/social/posts              # Tạo post mới
GET    /api/social/posts/feed         # Lấy feed công khai
GET    /api/social/posts/user/:userId # Lấy posts của user
GET    /api/social/posts/:postId      # Lấy post cụ thể
PUT    /api/social/posts/:postId      # Cập nhật post
DELETE /api/social/posts/:postId      # Xóa post
POST   /api/social/posts/:postId/like # Like/unlike post
POST   /api/social/posts/:postId/share # Share post
```

#### Comments
```
POST   /api/social/comments           # Tạo comment mới
GET    /api/social/comments/post/:postId # Lấy comments của post
GET    /api/social/comments/user/:userId # Lấy comments của user
PUT    /api/social/comments/:commentId # Cập nhật comment
DELETE /api/social/comments/:commentId # Xóa comment
POST   /api/social/comments/:commentId/like # Like/unlike comment
```

#### Achievements
```
GET    /api/achievements              # Lấy danh sách achievements
GET    /api/achievements/:id          # Lấy achievement cụ thể
GET    /api/achievements/user/:userId # Lấy achievements của user
GET    /api/achievements/user/:userId/stats # Stats của user
GET    /api/achievements/leaderboard/top # Bảng xếp hạng
PUT    /api/achievements/:id/progress # Cập nhật progress
POST   /api/achievements/:id/award/:userId # Award achievement (Admin)
```

#### Feed & Discovery
```
GET    /api/feed/trending             # Trending posts
GET    /api/feed/latest               # Latest posts
GET    /api/feed/users/popular        # Popular users
GET    /api/feed/leaderboard          # User leaderboard
GET    /api/feed/users/search         # Search users
GET    /api/feed/users/:userId        # User profile
```

#### Interactions
```
GET    /api/interactions/likes/posts   # Liked posts của user
GET    /api/interactions/shares/posts  # Shared posts của user
GET    /api/interactions/likes/comments # Liked comments của user
GET    /api/interactions/stats         # Interaction stats của user
```

### OAuth Endpoints

```
GET    /api/auth/google               # Google OAuth login
GET    /api/auth/google/callback      # Google OAuth callback
GET    /api/auth/facebook             # Facebook OAuth login
GET    /api/auth/facebook/callback    # Facebook OAuth callback
POST   /api/auth/link                 # Link OAuth account
DELETE /api/auth/unlink/:provider     # Unlink OAuth account
```

## Database Schema

### Social Media Collections (MongoDB)

#### Achievements
```javascript
{
  achievementId: String (unique),
  name: String,
  description: String,
  category: Enum['creation', 'interaction', 'social', 'milestone', 'special'],
  icon: String,
  badge: String,
  points: Number,
  rarity: Enum['common', 'uncommon', 'rare', 'epic', 'legendary'],
  requirements: Object,
  isActive: Boolean,
  isHidden: Boolean
}
```

#### UserAchievements
```javascript
{
  userAchievementId: String (unique),
  userId: String,
  achievementId: String,
  progress: Number (0-100),
  isCompleted: Boolean,
  unlockedAt: Date,
  metadata: Object
}
```

#### Posts
```javascript
{
  postId: String (unique),
  userId: String,
  scenarioId: String (optional),
  type: Enum['achievement', 'scenario', 'milestone', 'custom'],
  title: String,
  content: String,
  images: Array,
  tags: Array,
  visibility: Enum['public', 'friends', 'private'],
  likes: { count: Number, users: Array },
  shares: { count: Number, users: Array },
  comments: { count: Number },
  isDeleted: Boolean
}
```

#### Comments
```javascript
{
  commentId: String (unique),
  postId: String,
  userId: String,
  parentCommentId: String (optional),
  content: String,
  images: Array,
  likes: { count: Number, users: Array },
  replies: { count: Number },
  isDeleted: Boolean
}
```

#### UserProfiles
```javascript
{
  userId: String (unique),
  username: String (unique),
  displayName: String,
  bio: String,
  avatar: Object,
  location: String,
  website: String,
  socialLinks: Object,
  stats: {
    followers: Number,
    following: Number,
    posts: Number,
    scenarios: Number,
    totalLikes: Number,
    totalShares: Number,
    totalComments: Number,
    level: Number,
    experience: Number,
    reputation: Number
  },
  badges: Array,
  isVerified: Boolean
}
```

### User Model Extensions (PostgreSQL)

#### New Fields Added
```sql
-- OAuth fields
google_id VARCHAR UNIQUE,
facebook_id VARCHAR UNIQUE,
provider VARCHAR DEFAULT 'local',

-- Social media fields  
username VARCHAR(30) UNIQUE,
display_name VARCHAR(50),
bio TEXT,
avatar VARCHAR,
location VARCHAR(100),
website VARCHAR(200),

-- Social stats
followers INTEGER DEFAULT 0,
following INTEGER DEFAULT 0,
reputation INTEGER DEFAULT 0,
level INTEGER DEFAULT 1,
experience INTEGER DEFAULT 0,
is_verified BOOLEAN DEFAULT FALSE,
is_public BOOLEAN DEFAULT TRUE
```

## Environment Variables

### Social Service (.env)
```env
NODE_ENV=development
PORT=3006
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/what_if_social?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
USER_SERVICE_URL=http://user-service:3001
```

### User Service (.env) - OAuth
```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback
```

## Deployment

### Docker Compose
```bash
# Build và chạy tất cả services bao gồm social service
docker-compose up -d

# Kiểm tra status
docker-compose ps

# Logs của social service
docker-compose logs social-service
```

### Health Checks
```bash
# Social Service
curl http://localhost:3006/health

# API Gateway với social routes
curl http://localhost:3000/api/social/posts/feed
```

## Development Workflow

### 1. Thêm Achievement Mới
```javascript
// Trong social service
const achievement = new Achievement({
  achievementId: 'new_achievement',
  name: 'New Achievement',
  description: 'Description here',
  category: 'creation',
  icon: '🎯',
  badge: 'new-badge',
  points: 50,
  rarity: 'rare',
  requirements: { type: 'custom_action', count: 10 }
});
```

### 2. Tạo Post Từ Frontend
```javascript
const postData = {
  title: 'Tôi đã tạo viễn cảnh đầu tiên!',
  content: 'Viễn cảnh về thế giới không có Internet thật thú vị...',
  type: 'scenario',
  scenarioId: 'scenario_123',
  tags: ['viễn cảnh', 'công nghệ'],
  visibility: 'public'
};

const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(postData)
});
```

### 3. OAuth Login Flow
```javascript
// Redirect to OAuth provider
window.location.href = '/api/auth/google';

// Callback sẽ tự động xử lý và redirect về frontend với token
```

## Security Considerations

### 1. OAuth Security
- Validate OAuth tokens
- Secure callback URLs
- CSRF protection
- State parameter validation

### 2. Social Media Security
- Content moderation
- Rate limiting
- Input validation
- Privacy controls
- Report system

### 3. Data Protection
- Encrypt sensitive data
- GDPR compliance
- User consent
- Data retention policies

## Monitoring & Analytics

### 1. Social Metrics
- User engagement
- Post performance
- Achievement unlock rates
- OAuth adoption

### 2. Performance Metrics
- API response times
- Database query performance
- Cache hit rates
- Error rates

## Future Enhancements

### Phase 2
- Real-time notifications
- Direct messaging
- User groups/communities
- Advanced moderation tools

### Phase 3
- Mobile app integration
- Push notifications
- Advanced analytics
- Content recommendation engine

## Troubleshooting

### Common Issues

1. **OAuth Login Fails**
   - Check OAuth app configuration
   - Verify callback URLs
   - Check environment variables

2. **Social Service Not Starting**
   - Check MongoDB connection
   - Verify Redis connection
   - Check JWT secret

3. **Achievements Not Unlocking**
   - Check achievement requirements
   - Verify progress tracking
   - Check database indexes

### Debug Commands
```bash
# Check service logs
docker-compose logs social-service

# Check database connection
docker exec -it what-if-mongodb mongosh

# Check Redis connection
docker exec -it what-if-redis redis-cli ping
```

## Support

- **API Documentation**: http://localhost:3000/api-docs
- **Health Status**: http://localhost:3000/health
- **Social Service**: http://localhost:3006/health