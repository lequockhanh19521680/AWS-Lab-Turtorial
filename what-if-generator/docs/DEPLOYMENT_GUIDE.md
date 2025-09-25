# Hướng Dẫn Triển Khai What If Generator

## Tổng Quan

What If Generator là một hệ thống microservices được xây dựng để tạo ra các viễn cảnh "Nếu như..." sử dụng trí tuệ nhân tạo. Hệ thống bao gồm 5 microservices chính và có thể được triển khai bằng Docker hoặc Kubernetes.

## Kiến Trúc Hệ Thống

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└─────────┬───────┘
          │
┌─────────▼───────┐
│  API Gateway    │
│    (Port 3000)  │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐   ┌─────────┐   ┌─────────┐
│ User  │   │ Gen   │   │ History │   │ Sharing │
│Service│   │Service│   │ Service │   │ Service │
│(3001) │   │(3002) │   │ (3003)  │   │ (3004)  │
└───┬───┘   └───┬───┘   └────┬────┘   └────┬────┘
    │           │            │             │
    ▼           ▼            ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐   ┌─────────┐
│PostgreSQL│ │ Redis   │ │ MongoDB │   │ MongoDB │
│ (Users) │ │(Cache)  │ │(History)│   │(Sharing)│
└─────────┘ └─────────┘ └─────────┘   └─────────┘
```

## Yêu Cầu Hệ Thống

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB
- **OS**: Linux/macOS/Windows với Docker

### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+
- **OS**: Linux với Kubernetes

### Dependencies
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (để development)
- Kubernetes 1.25+ (cho production)

## Triển Khai với Docker Compose (Development)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/what-if-generator.git
cd what-if-generator
```

### 2. Cấu Hình Environment Variables
```bash
# Copy environment files
cp services/user-service/.env.example services/user-service/.env
cp services/generation-service/.env.example services/generation-service/.env
cp services/history-service/.env.example services/history-service/.env
cp services/sharing-service/.env.example services/sharing-service/.env
cp api-gateway/.env.example api-gateway/.env
```

### 3. Cập Nhật API Keys
Cập nhật các API keys trong các file `.env`:

**services/generation-service/.env**:
```env
GEMINI_API_KEY=your-actual-gemini-api-key
```

**services/user-service/.env**:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 4. Build và Chạy Services
```bash
# Build all Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### 5. Kiểm Tra Services
```bash
# API Gateway
curl http://localhost:3000/health

# Individual services
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Generation Service
curl http://localhost:3003/health  # History Service
curl http://localhost:3004/health  # Sharing Service
```

### 6. Access URLs
- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Frontend**: http://localhost:3005
- **Health Checks**: http://localhost:3000/health

## Triển Khai với Kubernetes (Production)

### 1. Chuẩn Bị Kubernetes Cluster
```bash
# Với minikube (local testing)
minikube start --memory=8192 --cpus=4

# Hoặc sử dụng cloud provider (AWS EKS, GCP GKE, Azure AKS)
```

### 2. Build và Push Docker Images
```bash
# Build images
docker build -t your-registry/user-service:latest services/user-service/
docker build -t your-registry/generation-service:latest services/generation-service/
docker build -t your-registry/history-service:latest services/history-service/
docker build -t your-registry/sharing-service:latest services/sharing-service/
docker build -t your-registry/api-gateway:latest api-gateway/

# Push to registry
docker push your-registry/user-service:latest
docker push your-registry/generation-service:latest
docker push your-registry/history-service:latest
docker push your-registry/sharing-service:latest
docker push your-registry/api-gateway:latest
```

### 3. Cập Nhật Kubernetes Manifests
Cập nhật `k8s/services.yaml` với image registry của bạn:
```yaml
image: your-registry/user-service:latest
```

### 4. Deploy to Kubernetes
```bash
# Create namespace and ConfigMaps
kubectl apply -f k8s/namespace.yaml

# Deploy databases
kubectl apply -f k8s/databases.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n what-if-generator --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n what-if-generator --timeout=300s

# Deploy services
kubectl apply -f k8s/services.yaml

# Check deployment status
kubectl get pods -n what-if-generator
kubectl get services -n what-if-generator
```

### 5. Kiểm Tra Deployment
```bash
# Check all pods are running
kubectl get pods -n what-if-generator

# Check logs nếu có issues
kubectl logs -l app=api-gateway -n what-if-generator

# Port forward to access locally
kubectl port-forward service/api-gateway 3000:3000 -n what-if-generator
```

## Cấu Hình Database

### PostgreSQL (User Service)
Databases sẽ được khởi tạo tự động với script trong `docker/postgres/init.sql`. Default admin user:
- Email: `admin@whatifgenerator.com`
- Password: `admin123` (⚠️ Đổi trong production!)

### MongoDB (History & Sharing Services)
Collections và indexes sẽ được tạo tự động với script trong `docker/mongodb/init.js`.

## Monitoring và Logging

### Health Checks
```bash
# Tất cả services
curl http://localhost:3000/health

# Chi tiết health check
curl http://localhost:3000/health/detailed

# Health check từng service
curl http://localhost:3000/health/services/user
curl http://localhost:3000/health/services/generation
```

### Logs
```bash
# Docker Compose
docker-compose logs -f [service-name]

# Kubernetes
kubectl logs -l app=[service-name] -n what-if-generator -f
```

### Metrics (Optional)
```bash
# API Gateway metrics
curl http://localhost:3000/metrics
```

## Bảo Mật

### 1. Thay Đổi Default Passwords
```bash
# PostgreSQL
POSTGRES_PASSWORD=your-secure-password

# MongoDB
MONGODB_PASSWORD=your-secure-password

# JWT Secret
JWT_SECRET=your-very-long-random-secret-key
```

### 2. SSL/TLS
Trong production, sử dụng HTTPS:
```yaml
# Trong ingress configuration
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: tls-secret
```

### 3. Rate Limiting
Rate limiting đã được cấu hình trong API Gateway:
- 1000 requests/15 minutes cho authenticated users
- 100 requests/15 minutes cho anonymous users

### 4. CORS Configuration
Cập nhật ALLOWED_ORIGINS trong API Gateway:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Backup và Recovery

### Database Backup
```bash
# PostgreSQL
docker exec postgres-container pg_dump -U postgres what_if_users > backup_users.sql

# MongoDB
docker exec mongodb-container mongodump --uri="mongodb://admin:admin123@localhost:27017/what_if_history?authSource=admin" --out=/backup
```

### Restore
```bash
# PostgreSQL
docker exec -i postgres-container psql -U postgres what_if_users < backup_users.sql

# MongoDB
docker exec mongodb-container mongorestore --uri="mongodb://admin:admin123@localhost:27017/what_if_history?authSource=admin" /backup/what_if_history
```

## Scaling

### Horizontal Scaling
```bash
# Scale services trong Kubernetes
kubectl scale deployment user-service --replicas=3 -n what-if-generator
kubectl scale deployment generation-service --replicas=3 -n what-if-generator
```

### Auto-scaling (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: what-if-generator
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues

1. **Services không start được**
   ```bash
   # Check logs
   docker-compose logs [service-name]
   kubectl logs -l app=[service-name] -n what-if-generator
   ```

2. **Database connection failed**
   ```bash
   # Check database status
   docker-compose ps
   kubectl get pods -l app=postgres -n what-if-generator
   ```

3. **API calls failing**
   ```bash
   # Check API Gateway logs
   docker-compose logs api-gateway
   kubectl logs -l app=api-gateway -n what-if-generator
   ```

4. **JWT token issues**
   - Kiểm tra JWT_SECRET trong tất cả services
   - Verify token expiration time

### Debug Commands
```bash
# Enter container để debug
docker exec -it [container-name] /bin/sh

# Port forward để access databases
kubectl port-forward service/postgres-service 5432:5432 -n what-if-generator
kubectl port-forward service/mongodb-service 27017:27017 -n what-if-generator
```

## Performance Tuning

### 1. Database Optimization
- Thêm indexes cho queries thường xuyên
- Setup connection pooling
- Monitor slow queries

### 2. Redis Caching
- Cache user sessions
- Cache frequent API responses
- Implement cache invalidation strategy

### 3. Load Balancing
- Use nginx reverse proxy
- Configure health checks
- Implement circuit breaker pattern

## Support

### Documentation
- API Docs: http://localhost:3000/api-docs
- Health Status: http://localhost:3000/health
- Project Wiki: [GitHub Wiki Link]

### Contact
- Technical Support: tech@whatifgenerator.com
- Issues: [GitHub Issues Link]
- Discussions: [GitHub Discussions Link]