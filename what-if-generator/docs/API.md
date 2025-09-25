# API Documentation

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.whatifgenerator.com`

## Authentication

All protected endpoints require JWT token in Authorization header:

```bash
Authorization: Bearer <jwt-token>
```

## Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "API Gateway is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### User Management

#### Register
```http
POST /api/auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-token"
  }
}
```

#### Login
```http
POST /api/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Scenario Generation

#### Generate Scenario
```http
POST /api/generate
```

**Request:**
```json
{
  "topic": "What if humans could fly?",
  "options": {
    "promptType": "fantasy",
    "length": "medium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scenario": {
      "id": "scenario123",
      "topic": "What if humans could fly?",
      "content": "Generated scenario content...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### Get Random Scenario
```http
GET /api/random
```

### History Management

#### Get User Scenarios
```http
GET /api/history?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scenarios": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### Delete Scenario
```http
DELETE /api/history/:id
```

### Sharing

#### Share Scenario
```http
POST /api/share
```

**Request:**
```json
{
  "scenarioId": "scenario123",
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://whatifgenerator.com/share/abc123",
    "qrCode": "data:image/png;base64,..."
  }
}
```

#### Get Shared Scenario
```http
GET /api/share/:shareId
```

### Video Generation

#### Generate Video
```http
POST /api/video/generate
```

**Request:**
```json
{
  "scenarioId": "scenario123",
  "options": {
    "style": "realistic",
    "duration": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video123",
    "status": "processing",
    "estimatedTime": 300
  }
}
```

#### Get Video Status
```http
GET /api/video/:videoId/status
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting

- **General**: 100 requests per 15 minutes
- **Generation**: 10 requests per hour
- **Video**: 5 requests per hour

## Pagination

Use query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

## Filtering & Sorting

### Scenarios
- `sort`: Sort field (createdAt, updatedAt, topic)
- `order`: Sort order (asc, desc)
- `search`: Search in topic and content
- `promptType`: Filter by prompt type

### Example
```http
GET /api/history?sort=createdAt&order=desc&search=flying&limit=10
```