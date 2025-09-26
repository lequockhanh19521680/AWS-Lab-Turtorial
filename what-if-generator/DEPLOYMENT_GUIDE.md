# What If Generator - Super Easy Deployment Guide

Hướng dẫn deploy dự án "Cỗ Máy Nếu Như" với chỉ vài câu lệnh đơn giản.

## 🚀 Quick Start - Deploy trong 3 bước

### 1. Cài đặt môi trường
```bash
# Clone project và vào thư mục
git clone [your-repo-url]
cd what-if-generator

# Cài đặt dependencies
npm run install:all
```

### 2. Chọn environment và deploy
```bash
# Development (local)
npm run deploy:dev

# Test environment (AWS)
npm run deploy:test

# Production (AWS)
npm run deploy:prod
```

### 3. Thành công! 🎉
- **Dev**: http://localhost:8080
- **Test/Prod**: URLs sẽ hiển thị sau khi deploy xong

## 📋 Yêu cầu hệ thống

Đảm bảo các tools sau đã được cài đặt:

- **Node.js** >= 18.0.0
- **Docker** và Docker Compose
- **AWS CLI** (cho test/prod)
- **kubectl** (optional, cho K8s)
- **Git**

## 🌍 Environments

### Development (Local)
- **Frontend**: Port 8080
- **Backend**: Port 3000
- **Database**: Local PostgreSQL hoặc Docker
- **Auto-seed**: Tự động tạo dữ liệu mẫu

### Test Environment (AWS)
- **RDS**: PostgreSQL riêng cho test
- **DynamoDB**: Shared với production
- **ECS**: Fargate containers
- **CloudFront**: CDN cho frontend

### Production (AWS)
- **RDS**: PostgreSQL riêng cho production
- **DynamoDB**: Shared với test
- **ECS**: Fargate containers với auto-scaling
- **CloudFront**: CDN với SSL certificate

## 🔧 Cấu hình nâng cao

### Environment Variables
Các file môi trường đã được chuẩn bị:
- `.env.dev` - Development
- `.env.test` - Test
- `.env.prod` - Production

### AWS Secrets Manager
Tất cả secrets được lưu trữ an toàn trên AWS:
- Database credentials
- JWT secrets
- API keys
- Email configuration

### Database Configuration
- **Dev**: RDS riêng + DynamoDB riêng
- **Test**: RDS riêng + DynamoDB shared
- **Prod**: RDS riêng + DynamoDB shared

## 📱 Deployment Commands

### Cơ bản
```bash
# Deploy development
./quick-deploy.sh dev

# Deploy test
./quick-deploy.sh test

# Deploy production (có xác nhận)
./quick-deploy.sh prod
```

### Nâng cao
```bash
# Deploy với options
./deploy.sh dev --skip-tests
./deploy.sh prod --force-build

# Build manual
npm run build
npm run build:docker

# Test trước khi deploy
npm run test
npm run lint
npm run type-check
```

### Các scripts khác
```bash
# Chạy local development
npm run dev

# Seed database
npm run seed

# Docker operations
npm run start:docker
npm run stop:docker

# Kubernetes (optional)
npm run deploy:k8s
npm run undeploy:k8s
```

## 🔍 Monitoring và Logs

### Development
```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs một service cụ thể
docker-compose logs -f user-service
docker-compose logs -f frontend

# Status của services
docker-compose ps
```

### Production (AWS)
```bash
# CloudWatch logs
aws logs tail /aws/ecs/what-if-generator-prod --follow

# ECS service status
aws ecs describe-services --cluster what-if-generator-prod --services api-gateway-service

# Health checks
curl https://your-domain.com/health
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Docker không start được
```bash
# Restart Docker service
sudo systemctl restart docker

# Clear Docker cache
docker system prune -a
```

#### 2. AWS credentials
```bash
# Configure AWS
aws configure

# Check credentials
aws sts get-caller-identity
```

#### 3. Port conflicts
```bash
# Kill processes using ports
sudo lsof -ti:8080 | xargs kill -9
sudo lsof -ti:3000 | xargs kill -9
```

#### 4. Database connection issues
```bash
# Check environment file
cat .env

# Test database connection
docker-compose exec user-service npm run test:db
```

### Logs Locations
- **Development**: `docker-compose logs`
- **Test/Prod**: CloudWatch Logs
- **Build logs**: GitHub Actions (nếu có CI/CD)

## 🔄 CI/CD Pipeline

### GitHub Actions (Recommended)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, develop]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Test
        if: github.ref == 'refs/heads/develop'
        run: ./deploy.sh test
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: ./deploy.sh prod
```

### AWS CodePipeline
- Tự động build và deploy khi push code
- Blue/Green deployment cho production
- Automatic rollback nếu có lỗi

## 📊 Performance Optimization

### Frontend
- **Next.js**: Static generation + SSR
- **CDN**: CloudFront caching
- **Image optimization**: Automatic WebP conversion
- **Bundle splitting**: Code splitting tự động

### Backend
- **Caching**: Redis cho session và data
- **Database**: Connection pooling
- **Auto-scaling**: ECS Fargate auto-scaling
- **Load balancing**: Application Load Balancer

## 🔒 Security

### Best Practices Implemented
- **HTTPS**: SSL certificates tự động
- **Secrets**: AWS Secrets Manager
- **Rate limiting**: API rate limiting
- **CORS**: Configured properly
- **Helmet**: Security headers
- **JWT**: Secure authentication
- **SQL Injection**: Parameterized queries
- **XSS**: Input sanitization

## 📈 Scaling

### Automatic Scaling
- **ECS**: Auto-scaling based on CPU/Memory
- **RDS**: Auto-scaling storage
- **DynamoDB**: On-demand scaling
- **CloudFront**: Global CDN

### Manual Scaling
```bash
# Scale ECS service
aws ecs update-service --cluster production --service api-gateway --desired-count 5

# Scale RDS
aws rds modify-db-instance --db-instance-identifier prod-db --db-instance-class db.r5.xlarge
```

## 💰 Cost Optimization

### Development
- **Fargate Spot**: 70% cost savings
- **Single NAT Gateway**: Reduced networking costs
- **t3.micro instances**: Free tier eligible

### Production
- **Reserved Instances**: Up to 72% savings
- **S3 Intelligent Tiering**: Automatic cost optimization
- **CloudWatch**: Efficient logging retention

## 🆘 Support

### Quick Help
```bash
# Show help
./deploy.sh --help
./quick-deploy.sh --help

# Check system requirements
./deploy.sh --check-requirements
```

### Community Support
- **GitHub Issues**: [Link to issues]
- **Documentation**: [Link to docs]
- **Slack/Discord**: [Link to community]

---

## 📝 Summary

Để deploy dự án chỉ cần:

1. **Development**: `npm run deploy:dev`
2. **Test**: `npm run deploy:test`  
3. **Production**: `npm run deploy:prod`

Hoặc thậm chí đơn giản hơn:
```bash
./quick-deploy.sh dev    # Cho development
./quick-deploy.sh test   # Cho test
./quick-deploy.sh prod   # Cho production
```

**Thế thôi! 🎉**

Deployment giờ đây chỉ là một câu lệnh duy nhất. Tất cả phức tạp về infrastructure, database, secrets, scaling đều đã được tự động hóa.