# System Architecture

## Overview

What If Generator is a microservices-based AI platform for generating interactive scenarios with a modern, cloud-native architecture designed for scalability and reliability.

## Architecture Principles

- **Microservices**: Each service has a single responsibility with clear boundaries
- **API Gateway Pattern**: Central entry point for all client requests with routing, authentication, and rate limiting
- **Database per Service**: Each service owns its data with appropriate database technology
- **Cloud-Native**: Designed for AWS with infrastructure as code
- **Security-First**: Built-in security at every layer
- **Observability**: Comprehensive monitoring, logging, and tracing

## Corrected Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   CloudFront    │    │       ALB       │
│   (Next.js)     │◄──►│      CDN        │◄──►│  Load Balancer  │
│   S3 + CF       │    │   Static Assets │    │  (Port 80/443)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   API Gateway   │
                                              │   (Port 3000)   │
                                              │  Authentication │
                                              │  Rate Limiting  │
                                              │     Routing     │
                                              └─────────────────┘
                                                       │
                               ┌───────────────────────┼───────────────────────┐
                               │                       │                       │
                      ┌────────▼──────┐       ┌───────▼─────┐        ┌────────▼──────┐
                      │ User Service  │       │Generation   │        │History Service│
                      │  (Port 3001)  │       │Service      │        │  (Port 3003)  │
                      │  PostgreSQL   │       │(Port 3002)  │        │   DynamoDB    │
                      │  Auth & Users │       │AI Providers │        │   Scenarios   │
                      └───────────────┘       └─────────────┘        └───────────────┘
                               │                       │                       │
                      ┌────────▼──────┐       ┌───────▼─────┐        ┌────────▼──────┐
                      │Sharing Service│       │Video Service│        │Social Service │
                      │  (Port 3004)  │       │(Port 3005)  │        │  (Port 3006)  │
                      │   DynamoDB    │       │    Redis    │        │   DynamoDB    │
                      │   Sharing     │       │TTS & Video  │        │Social Features│
                      └───────────────┘       └─────────────┘        └───────────────┘
                               │                       │                       │
                               └───────────────────────┼───────────────────────┘
                                                       │
                                              ┌─────────────────┐
                                              │     Redis       │
                                              │   (Port 6379)   │
                                              │ Cache & Session │
                                              └─────────────────┘
```

## Corrected Data Flow

1. **User Request** → CloudFront CDN (for static assets) OR ALB (for API calls)
2. **ALB** → API Gateway (single entry point for all API requests)
3. **API Gateway** → Authentication, Rate Limiting, Request Routing
4. **API Gateway** → Appropriate Microservice
5. **Microservice** → Business Logic Processing
6. **Microservice** → Database/Cache Operations
7. **Response** → API Gateway → ALB → Client

## Fixed Technology Stack

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework with middleware
- **JWT** - Stateless authentication
- **Redis** - Session management and caching
- **PostgreSQL** - User service data (ACID compliance)
- **DynamoDB** - NoSQL for scalable content data
- **AWS SDK** - Cloud service integrations

### Frontend  
- **Next.js** - React framework with SSR/SSG
- **React 18** - UI library with hooks
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **SWR/React Query** - Data fetching and caching

### Infrastructure
- **Docker** - Containerization for consistent deployments
- **AWS ECS Fargate** - Serverless container orchestration
- **AWS CloudFormation** - Infrastructure as Code
- **AWS ALB** - Application Load Balancer
- **AWS CloudFront** - Global CDN
- **AWS S3** - Static asset hosting

## Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with refresh tokens
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **OAuth Integration**: Google, Facebook social login
- **Session Management**: Redis-backed sessions with expiration

### Network Security
- **VPC Isolation**: Private subnets for services
- **Security Groups**: Least privilege network access
- **WAF**: Web Application Firewall on CloudFront
- **SSL/TLS**: End-to-end encryption
- **Secrets Management**: AWS Secrets Manager for sensitive data

### Application Security
- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: Per-user and per-IP limits
- **CORS Protection**: Configured origins
- **Security Headers**: Helmet.js with CSP, HSTS, etc.
- **API Key Management**: Encrypted storage and rotation

## Scalability & Performance

### Horizontal Scaling
- **Auto Scaling Groups**: ECS services scale based on CPU/memory
- **Load Balancing**: AWS ALB with health checks
- **Service Discovery**: Internal DNS for service communication
- **Circuit Breakers**: Resilient inter-service communication

### Database Scaling
- **PostgreSQL**: Read replicas for user service
- **DynamoDB**: Auto-scaling read/write capacity
- **Redis Clustering**: Distributed caching and sessions
- **Connection Pooling**: Efficient database connections

### Caching Strategy
- **CDN Caching**: CloudFront for static assets
- **Application Caching**: Redis for API responses
- **Browser Caching**: Appropriate cache headers
- **Database Query Caching**: Optimized queries

## Observability & Monitoring

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Centralized Logs**: CloudWatch Logs
- **Log Levels**: Environment-appropriate verbosity
- **Security Logging**: Authentication and authorization events

### Metrics & Monitoring
- **CloudWatch Metrics**: Custom application metrics
- **Health Checks**: Comprehensive service health monitoring
- **Performance Monitoring**: Response times and throughput
- **Business Metrics**: User engagement and feature usage

### Tracing & Debugging
- **AWS X-Ray**: Distributed request tracing
- **Error Tracking**: Centralized error collection
- **Performance Profiling**: Bottleneck identification
- **Debugging Tools**: Enhanced development experience

### Alerting
- **CloudWatch Alarms**: Automated alerting on thresholds
- **SNS Notifications**: Multi-channel alert delivery
- **Escalation Policies**: Tiered response procedures
- **Dashboard**: Real-time system overview

## Environment Strategy

### Development
- **Local Docker Compose**: Full local development stack
- **Local DynamoDB**: Amazon DynamoDB Local
- **Hot Reloading**: Fast development iteration
- **Debug Mode**: Enhanced logging and error details

### Test/Staging
- **AWS Environment**: Production-like infrastructure
- **Automated Testing**: CI/CD pipeline integration
- **Data Seeding**: Test data management
- **Performance Testing**: Load testing capabilities

### Production
- **High Availability**: Multi-AZ deployment
- **Disaster Recovery**: Automated backups and recovery
- **Blue-Green Deployment**: Zero-downtime deployments
- **Monitoring**: Comprehensive observability stack

## Port Architecture (Fixed)

### Service Ports (DO NOT CHANGE)
- **API Gateway**: 3000 (External ALB entry point)
- **User Service**: 3001 (Internal only)
- **Generation Service**: 3002 (Internal only)  
- **History Service**: 3003 (Internal only)
- **Sharing Service**: 3004 (Internal only)
- **Video Service**: 3005 (Internal only)
- **Social Service**: 3006 (Internal only)
- **Frontend**: 3007 (Local dev only, S3+CloudFront in production)

### Database Ports
- **PostgreSQL**: 5432
- **Redis**: 6379
- **DynamoDB Local**: 8000 (dev only)

### Load Balancer Architecture (Corrected)
- **ALB**: Routes ALL traffic to API Gateway (port 3000)
- **API Gateway**: Handles routing to appropriate services
- **Frontend**: Served via S3 + CloudFront (NOT through ALB)
- **Health Checks**: API Gateway provides unified health endpoint