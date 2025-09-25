# Deployment Guide

## Production Deployment với Docker

### 1. Chuẩn bị

```bash
# Clone repository
git clone <your-repo-url>
cd what-if-generator

# Tạo production .env file
cp .env.example .env
```

### 2. Cấu hình Environment Variables

Chỉnh sửa `.env` với các giá trị production:

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-secret
POSTGRES_PASSWORD=your-secure-database-password

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Frontend URL (thay đổi theo domain của bạn)
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 3. Deploy với Docker Compose

```bash
# Build và start tất cả services
docker-compose up -d --build

# Kiểm tra logs
docker-compose logs -f

# Kiểm tra health của services
curl http://localhost:3001/health
```

## Cloud Deployment

### AWS ECS/Fargate

1. **Build và push images lên ECR**:
```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# Build và tag images
docker build -t what-if-frontend ./frontend
docker tag what-if-frontend:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/what-if-frontend:latest

# Push image
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/what-if-frontend:latest
```

2. **Tạo ECS Task Definition** với các services
3. **Setup ALB** để route traffic
4. **Cấu hình RDS PostgreSQL** và **ElastiCache Redis**

### Google Cloud Run

```bash
# Build và deploy từng service
gcloud run deploy what-if-frontend \
  --source ./frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy API Gateway
gcloud run deploy what-if-api-gateway \
  --source ./backend/api-gateway \
  --platform managed \
  --region us-central1 \
  --set-env-vars="USER_SERVICE_URL=https://user-service-url"
```

### DigitalOcean App Platform

1. **Connect GitHub repository**
2. **Configure build commands**:
   - Frontend: `cd frontend && npm run build`
   - Services: `cd backend/<service> && npm run build`
3. **Set environment variables** trong dashboard
4. **Deploy**

## Database Migration

### Production Database Setup

```sql
-- Connect to PostgreSQL instance
psql -h your-db-host -U your-db-user -d postgres

-- Create databases
CREATE DATABASE whatif_users;
CREATE DATABASE whatif_history;

-- Run initialization script
\i database/init.sql
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h your-db-host -U your-db-user whatif_users > backup_users_$DATE.sql
pg_dump -h your-db-host -U your-db-user whatif_history > backup_history_$DATE.sql
```

## Monitoring & Logging

### Health Checks

Tất cả services có health check endpoints:

- Frontend: `GET /api/health`
- API Gateway: `GET /health`
- User Service: `GET /health`
- Generation Service: `GET /health`
- History Service: `GET /health`

### Logging với ELK Stack

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
  
  logstash:
    image: logstash:7.14.0
    
  kibana:
    image: kibana:7.14.0
    ports:
      - "5601:5601"
```

### Prometheus Metrics

Thêm monitoring cho từng service:

```javascript
// Add to each service
const prometheus = require('prom-client')
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
})
```

## SSL/TLS Configuration

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Let's Encrypt với Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email_hash ON users USING hash(email);
CREATE INDEX CONCURRENTLY idx_scenarios_user_created ON scenarios(user_id, created_at DESC);

-- Analyze tables
ANALYZE users;
ANALYZE scenarios;
```

### Redis Caching

```javascript
// Cache frequent queries
const redis = require('redis')
const client = redis.createClient(process.env.REDIS_URL)

async function getScenarioHistory(userId) {
  const cacheKey = `history:${userId}`
  const cached = await client.get(cacheKey)
  
  if (cached) {
    return JSON.parse(cached)
  }
  
  const data = await ScenarioModel.findByUserId(userId)
  await client.setex(cacheKey, 300, JSON.stringify(data)) // 5 min cache
  return data
}
```

### CDN Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
  },
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

## Security Checklist

- [ ] Environment variables không commit vào git
- [ ] JWT secret đủ mạnh (32+ characters)
- [ ] Database passwords phức tạp
- [ ] Rate limiting được bật
- [ ] HTTPS được cấu hình
- [ ] CORS được setup đúng
- [ ] Input validation được thực hiện
- [ ] SQL injection protection
- [ ] XSS protection headers
- [ ] Content Security Policy
- [ ] Regular security updates

## Troubleshooting

### Common Issues

1. **Service không start được**:
   ```bash
   # Check logs
   docker-compose logs -f service-name
   
   # Check environment variables
   docker-compose exec service-name env
   ```

2. **Database connection failed**:
   ```bash
   # Test database connectivity
   docker-compose exec postgres psql -U whatif_user -d whatif_users -c "SELECT 1;"
   ```

3. **AI API not working**:
   ```bash
   # Test API key
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

### Performance Issues

1. **High response time**:
   - Check database query performance
   - Add Redis caching
   - Optimize AI API calls

2. **Memory usage high**:
   - Monitor with `docker stats`
   - Adjust connection pool sizes
   - Add resource limits

3. **Database locks**:
   ```sql
   -- Check for locks
   SELECT * FROM pg_locks WHERE NOT granted;
   
   -- Kill blocking queries
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';
   ```