# API Documentation

## Base URL

All API endpoints are accessed through the API Gateway at: `http://localhost:3001`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication (`/auth`)

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Đăng ký thành công",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Đăng nhập thành công",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2025-09-25T00:00:00.000Z"
  }
}
```

### Scenario Generation (`/scenarios/generate`)

#### Generate Scenario
```http
POST /scenarios/generate
Content-Type: application/json
Authorization: Bearer <token> (optional)

{
  "topic": "Nếu như Trái Đất hình vuông"
}
```

**Response:**
```json
{
  "topic": "Nếu như Trái Đất hình vuông",
  "content": "Nếu như Trái Đất hình vuông, cuộc sống sẽ...",
  "model": "gemini-pro",
  "timestamp": "2025-09-25T00:00:00.000Z"
}
```

### History Management (`/scenarios`)

#### Get History
```http
GET /scenarios/history?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "scenarios": [
    {
      "id": 1,
      "user_id": 1,
      "topic": "Nếu như Trái Đất hình vuông",
      "content": "Viễn cảnh content here...",
      "created_at": "2025-09-25T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### Get Specific Scenario
```http
GET /scenarios/:id
Authorization: Bearer <token>
```

#### Delete Scenario
```http
DELETE /scenarios/:id
Authorization: Bearer <token>
```

## Error Responses

All endpoints may return these error formats:

### 400 Bad Request
```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "message": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Generation endpoint**: 5 requests per minute per IP

## Content Filtering

The Generation Service includes basic content filtering to prevent inappropriate content. Filtered topics will receive a generic error message.

## AI Models

The system attempts to use AI providers in this order:
1. Google Gemini (if `GEMINI_API_KEY` is provided)
2. OpenAI GPT-3.5 (if `OPENAI_API_KEY` is provided)
3. Fallback mock responses (if no API keys are available)