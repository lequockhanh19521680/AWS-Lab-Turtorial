# What If: The Story Hub MVP

## 🎯 Overview

**What If: The Story Hub** is a comprehensive storytelling platform that allows users to create high-quality scripts and audio narrations for free, with premium 3D video generation capabilities. The MVP focuses on building user habits through free text/audio generation while monetizing through premium video features.

## 🚀 Key Features

### Free Tier (Text/Audio MVP)
- ✅ **Script Generation**: AI-powered detailed scripts with ACT structure
- ✅ **Audio Narration**: High-quality TTS with professional voices
- ✅ **Credit System**: 10 free script generations per user
- ✅ **Progress Indicators**: Real-time generation progress
- ✅ **Download Support**: Free audio file downloads

### Premium Tier (3D Video)
- ✅ **3D Video Generation**: Cinematic quality video creation
- ✅ **Premium Audio**: Enhanced TTS with multiple voice options
- ✅ **Unlimited Credits**: No generation limits for premium users
- ✅ **Priority Processing**: Faster generation times
- ✅ **Advanced Customization**: Multiple styles and quality options

## 🏗️ Architecture

### Microservices Structure
```
┌─────────────────┐
│   Frontend      │ (React/Next.js)
│   Port: 3005    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│  API Gateway    │ (Express.js)
│    Port: 3000   │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ User  │   │ Gen   │   │ History │   │ Sharing │   │ Video   │
│Service│   │Service│   │ Service │   │ Service │   │ Service │
│(3001) │   │(3002) │   │ (3003)  │   │ (3004)  │   │ (3005)  │
└───┬───┘   └───┬───┘   └────┬────┘   └────┬────┘   └────┬────┘
    │           │            │             │             │
    ▼           ▼            ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐
│PostgreSQL│ │ Redis   │ │ MongoDB │   │ MongoDB │   │ File    │
│ (Users) │ │(Cache)  │ │(History)│   │(Sharing)│   │Storage  │
└─────────┘ └─────────┘ └─────────┘   └─────────┘   └─────────┘
```

### Story Hub Components

#### Frontend (`/frontend`)
- **StoryHub.tsx**: Main component with conversion zone
- **storyHubAPI.ts**: API client for Story Hub endpoints
- **UI Components**: Progress indicators, audio player, premium demo

#### Generation Service (`/services/generation-service`)
- **Story Hub Controller**: Script generation and audio integration
- **Premium Service**: Payment processing and subscription management
- **Story Hub Prompts**: ACT-structured script generation
- **Credit System**: Free tier management

#### Video Service (`/services/video-service`)
- **Story Hub Video**: 3D video generation for premium users
- **TTS Integration**: High-quality audio generation
- **Video Processing**: Audio-video synchronization

#### API Gateway (`/api-gateway`)
- **Route Management**: Story Hub endpoint routing
- **Authentication**: JWT-based user authentication
- **Rate Limiting**: Credit-based usage limits

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** for user data
- **MongoDB** for content storage
- **Redis** for caching and sessions
- **Docker** for containerization

### Frontend
- **Next.js** with React
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons

### AI Services
- **Google Gemini** for script generation
- **OpenAI TTS** for audio generation
- **Luma AI/Runway** for video generation

### Payment Processing
- **Stripe** integration (ready for production)
- **Mock payment** system for development

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- AI API keys (Gemini, OpenAI)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd what-if-generator
```

### 2. Configure Environment
```bash
# Copy environment files
cp services/generation-service/.env.example services/generation-service/.env
cp api-gateway/.env.example api-gateway/.env

# Update with your API keys
# Edit .env files with your actual API keys
```

### 3. Deploy with Docker
```bash
# Make deployment script executable
chmod +x deploy-story-hub.sh

# Deploy the Story Hub MVP
./deploy-story-hub.sh development
```

### 4. Access the Application
- **Frontend**: http://localhost:3005
- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs

## 📋 User Flow

### 1. Free Tier Experience
1. **Input Prompt**: User enters a "What if..." scenario
2. **Script Generation**: AI creates detailed script with ACT structure
3. **Audio Generation**: TTS converts script to professional narration
4. **Download**: User can download audio file for free
5. **Conversion Zone**: Premium upgrade prompts appear

### 2. Premium Conversion
1. **Upgrade Prompt**: Attractive conversion zone with demo video
2. **Payment**: $5 USD for basic premium plan
3. **Unlock Features**: Access to 3D video generation
4. **Video Creation**: Generate cinematic 3D videos from scripts

### 3. Premium Experience
1. **Unlimited Scripts**: No credit limits
2. **3D Video Generation**: High-quality video creation
3. **Priority Processing**: Faster generation times
4. **Advanced Options**: Multiple styles and quality settings

## 🔧 API Endpoints

### Story Hub Endpoints
```bash
# Script Generation
POST /api/story-hub/generate-script
{
  "prompt": "Nếu như loài chó có thể nói tiếng người...",
  "options": {
    "includeActs": true,
    "includeDialogue": true,
    "maxTokens": 1500
  }
}

# Audio Generation
POST /api/story-hub/generate-audio
{
  "script": "Generated script content...",
  "options": {
    "voice": "professional",
    "speed": 1.0,
    "format": "mp3"
  }
}

# Premium Upgrade
POST /api/story-hub/upgrade
{
  "planName": "basic"
}

# Video Generation (Premium)
POST /api/video/generate-story-hub
{
  "script": "Script content...",
  "audioUrl": "https://...",
  "options": {
    "quality": "high",
    "style": "cinematic",
    "duration": "auto"
  }
}
```

## 💰 Monetization Strategy

### Free Tier (User Acquisition)
- 10 free script generations
- High-quality audio downloads
- Basic script structure
- Conversion-focused UI

### Premium Tier (Revenue Generation)
- $5 USD/month for basic plan
- Unlimited script generation
- 3D video generation
- Priority processing
- Advanced customization

### Cost Control
- Only generate expensive 3D videos for paying customers
- Free tier uses cheaper AI APIs
- Premium tier justifies higher costs

## 🧪 Testing

### Run Complete Flow Test
```bash
# Install test dependencies
npm install

# Run comprehensive test
node test-story-hub-flow.js
```

### Test Coverage
- ✅ Health checks for all services
- ✅ User registration and authentication
- ✅ Script generation with ACT structure
- ✅ Audio generation and TTS integration
- ✅ Premium upgrade flow
- ✅ Video generation (premium feature)
- ✅ Credit system functionality

## 📊 Monitoring

### Health Checks
- **API Gateway**: http://localhost:3000/health
- **Story Hub**: http://localhost:3000/api/story-hub/health
- **Video Service**: http://localhost:3000/api/video/health

### Logs
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f generation-service
docker-compose logs -f video-service
```

## 🔒 Security

### Authentication
- JWT-based authentication
- Secure password hashing
- Session management with Redis

### API Security
- Rate limiting per user
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

### Data Protection
- Environment variable encryption
- Secure database connections
- File upload validation

## 🚀 Production Deployment

### Environment Setup
1. **Update API Keys**: Replace mock keys with production keys
2. **Configure Payment**: Set up Stripe for production
3. **SSL Certificates**: Configure HTTPS
4. **Database Backups**: Set up automated backups
5. **Monitoring**: Configure logging and metrics

### Scaling Considerations
- Horizontal scaling with Kubernetes
- Database read replicas
- CDN for static assets
- Load balancing for high traffic

## 📈 Business Metrics

### Key Performance Indicators
- **Conversion Rate**: Free to premium conversion
- **User Retention**: Daily/monthly active users
- **Revenue per User**: Average revenue per premium user
- **Cost per Acquisition**: Marketing cost per new user
- **Generation Success Rate**: Successful script/video generation rate

### Analytics Tracking
- User behavior in conversion zone
- Script generation patterns
- Premium upgrade funnel
- Video generation usage

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Comprehensive testing

## 📞 Support

### Documentation
- API Documentation: http://localhost:3000/api-docs
- Architecture Guide: `/docs/ARCHITECTURE.md`
- Deployment Guide: `/docs/DEPLOYMENT_GUIDE.md`

### Contact
- Technical Issues: Create GitHub issue
- Business Inquiries: Contact project maintainers
- Security Issues: Report privately

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🎉 Success Metrics

The Story Hub MVP is designed to achieve:

1. **User Acquisition**: Free tier attracts users with high-quality text/audio
2. **Conversion**: Premium upgrade prompts drive $5 USD subscriptions
3. **Revenue**: Premium users generate 3D videos at $1-3 USD cost per video
4. **Profitability**: Revenue exceeds API costs for sustainable growth
5. **Scalability**: Microservices architecture supports growth

**Target**: 1000+ free users, 100+ premium users, $500+ monthly revenue

---

*Built with ❤️ for the future of storytelling*