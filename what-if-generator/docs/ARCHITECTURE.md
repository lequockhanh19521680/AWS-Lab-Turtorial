# System Architecture

## Overview

What If Generator is a microservices-based AI platform for generating interactive scenarios.

## Architecture Principles

- **Microservices**: Each service has a single responsibility
- **API Gateway**: Central entry point for all requests
- **Database per Service**: Each service owns its data
- **Event-Driven**: Services communicate via events
- **Cloud-Native**: Designed for AWS deployment

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   User Service  │
│   (React)       │◄──►│   (Port 3000)   │◄──►│   (Port 3001)   │
│   Port 3005     │    │                 │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Generation Svc  │
                       │   (Port 3002)   │
                       │   AI Providers  │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  History Svc    │
                       │   (Port 3003)   │
                       │   MongoDB       │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Sharing Svc    │
                       │   (Port 3004)   │
                       │   MongoDB       │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Video Svc      │
                       │   (Port 3005)   │
                       │   Video APIs    │
                       └─────────────────┘
```

## Data Flow

1. **User Request** → Frontend
2. **Frontend** → API Gateway
3. **API Gateway** → Authentication & Routing
4. **Service** → Business Logic
5. **Service** → Database/Cache
6. **Response** → API Gateway → Frontend

## Technology Stack

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **JWT** - Authentication
- **Redis** - Caching & sessions
- **PostgreSQL** - User data
- **MongoDB** - Content data

### Frontend
- **React** - UI framework
- **Next.js** - Full-stack framework
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

### Infrastructure
- **Docker** - Containerization
- **AWS** - Cloud platform
- **Kubernetes** - Orchestration
- **CloudFormation** - Infrastructure as Code

## Security Architecture

- **Authentication**: JWT tokens
- **Authorization**: Role-based access
- **Rate Limiting**: Per-user limits
- **CORS**: Cross-origin protection
- **Helmet**: Security headers
- **Input Validation**: All inputs validated

## Scalability

- **Horizontal Scaling**: Multiple service instances
- **Load Balancing**: AWS ALB
- **Auto Scaling**: Based on metrics
- **Database Scaling**: Read replicas
- **Caching**: Redis for performance

## Monitoring

- **Health Checks**: All services
- **Logging**: Structured logs
- **Metrics**: Performance data
- **Tracing**: Request tracing
- **Alerting**: Error notifications