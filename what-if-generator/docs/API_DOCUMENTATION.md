# What If Generator - API Documentation

## Overview

What If Generator API cung cấp các endpoint để tạo và quản lý các viễn cảnh "Nếu như..." sử dụng AI. API được xây dựng theo kiến trúc microservices với API Gateway làm điểm vào duy nhất.

**Base URL**: `http://localhost:3000` (development) hoặc `https://api.yourdomain.com` (production)

**API Version**: v1.0.0

## Authentication

API sử dụng JWT (JSON Web Tokens) để xác thực người dùng.

### Authentication Flow

1. **Login**: POST `/api/auth/login` để nhận access token
2. **Include Token**: Thêm `Authorization: Bearer <token>` vào headers
3. **Refresh Token**: Sử dụng refresh token khi access token hết hạn

### Headers Required
```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

## Response Format

Tất cả API responses đều follow cấu trúc sau:

```json
{
  "success": true|false,
  "message": "Descriptive message",
  "data": {
    // Response data here
  },
  "errors": [
    {
      "field": "field_name",
      "message": "Error message",
      "value": "invalid_value"
    }
  ]
}
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## Rate Limits

- **Authenticated Users**: 1000 requests per 15 minutes
- **Anonymous Users**: 100 requests per 15 minutes
- **Generation Endpoints**: 50 requests per 15 minutes (authenticated), 10 requests per 15 minutes (anonymous)
- **Authentication Endpoints**: 20 requests per 15 minutes

Headers returned with rate limit info:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-01T12:00:00Z
```

---

## Authentication Endpoints

### POST /api/auth/register

Đăng ký tài khoản mới.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": "24h"
  }
}
```

### POST /api/auth/login

Đăng nhập vào hệ thống.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": "24h"
  }
}
```

### POST /api/auth/logout

Đăng xuất khỏi hệ thống.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

### POST /api/auth/refresh

Làm mới access token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": "24h"
  }
}
```

### POST /api/auth/forgot-password

Yêu cầu reset mật khẩu.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn"
}
```

### POST /api/auth/reset-password

Đặt lại mật khẩu với token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công"
}
```

---

## User Management Endpoints

### GET /api/users/profile

Lấy thông tin profile người dùng hiện tại.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": true,
      "preferences": {
        "theme": "light",
        "language": "vi",
        "notifications": true
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### PUT /api/users/profile

Cập nhật thông tin profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": false
  }
}
```

### PUT /api/users/change-password

Đổi mật khẩu.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

---

## Scenario Generation Endpoints

### POST /api/generate

Tạo viễn cảnh mới từ chủ đề.

**Headers:** `Authorization: Bearer <token>` (optional)

**Request Body:**
```json
{
  "topic": "Nếu như con người có thể bay",
  "options": {
    "promptType": "fantasy",
    "temperature": 0.8,
    "maxTokens": 1000,
    "language": "vi"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Viễn cảnh đã được tạo thành công",
  "data": {
    "scenario": {
      "id": "scenario_123",
      "topic": "Nếu như con người có thể bay",
      "content": "Trong một thế giới mà con người có thể bay...",
      "promptType": "fantasy",
      "provider": "gemini",
      "model": "gemini-pro",
      "tokens": {
        "prompt": 50,
        "completion": 300,
        "total": 350
      },
      "generatedAt": "2024-01-01T12:00:00Z",
      "cached": false
    },
    "userAuthenticated": true
  }
}
```

### GET /api/random

Tạo viễn cảnh ngẫu nhiên.

**Response:**
```json
{
  "success": true,
  "message": "Viễn cảnh ngẫu nhiên đã được tạo",
  "data": {
    "scenario": {
      "id": "scenario_456",
      "topic": "Nếu như thời gian có thể dừng lại",
      "content": "Hãy tưởng tượng một thế giới...",
      "promptType": "default",
      "generatedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### POST /api/regenerate

Tạo lại viễn cảnh với tùy chọn khác.

**Headers:** `Authorization: Bearer <token>` (optional)

**Request Body:**
```json
{
  "topic": "Nếu như con người có thể bay",
  "previousScenarioId": "scenario_123",
  "options": {
    "promptType": "scientific",
    "temperature": 0.9
  }
}
```

### POST /api/batch-generate

Tạo nhiều viễn cảnh cùng lúc.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "topics": [
    "Nếu như con người có thể bay",
    "Nếu như động vật có thể nói chuyện",
    "Nếu như thời gian có thể dừng lại"
  ],
  "options": {
    "promptType": "fantasy",
    "temperature": 0.8
  }
}
```

---

## Scenario History Endpoints

### GET /api/scenarios/my

Lấy danh sách scenarios của user hiện tại.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (int): Trang hiện tại (default: 1)
- `limit` (int): Số lượng items per page (default: 20, max: 50)
- `sort` (string): Sắp xếp theo (createdAt, updatedAt, rating, viewCount)
- `order` (string): Thứ tự (asc, desc)
- `promptType` (string): Lọc theo loại prompt
- `isFavorite` (boolean): Lọc scenarios yêu thích
- `tags` (string): Lọc theo tags (comma-separated)

**Example:** `/api/scenarios/my?page=1&limit=10&sort=createdAt&order=desc&isFavorite=true`

**Response:**
```json
{
  "success": true,
  "data": {
    "scenarios": [
      {
        "scenarioId": "scenario_123",
        "topic": "Nếu như con người có thể bay",
        "content": "Trong một thế giới...",
        "promptType": "fantasy",
        "tags": ["thú vị", "khoa học viễn tưởng"],
        "isFavorite": true,
        "rating": 5,
        "viewCount": 10,
        "shareCount": 2,
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /api/scenarios/search

Tìm kiếm scenarios.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q` (string): Từ khóa tìm kiếm
- `tags` (string): Tags (comma-separated)
- `promptType` (string): Loại prompt
- `dateFrom` (date): Từ ngày
- `dateTo` (date): Đến ngày
- `page`, `limit`, `sort`, `order`: Như endpoint `/my`

**Example:** `/api/scenarios/search?q=con người&tags=thú vị,khoa học&promptType=fantasy`

### GET /api/scenarios/{scenarioId}

Lấy chi tiết một scenario.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "scenario": {
      "scenarioId": "scenario_123",
      "topic": "Nếu như con người có thể bay",
      "content": "Trong một thế giới...",
      "promptType": "fantasy",
      "tags": ["thú vị"],
      "viewCount": 11,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### PATCH /api/scenarios/{scenarioId}

Cập nhật scenario (tags, favorite, rating, public).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "tags": ["thú vị", "sáng tạo", "khoa học"],
  "isFavorite": true,
  "rating": 5,
  "isPublic": true
}
```

### DELETE /api/scenarios/{scenarioId}

Xóa scenario khỏi lịch sử.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Scenario đã được xóa thành công"
}
```

### GET /api/scenarios/stats

Lấy thống kê scenarios của user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalScenarios": 25,
      "favoriteScenarios": 5,
      "publicScenarios": 3,
      "recentScenarios": 2,
      "totalViews": 150,
      "totalShares": 8,
      "popularTags": [
        {"tag": "thú vị", "count": 10},
        {"tag": "khoa học", "count": 5}
      ]
    }
  }
}
```

### PATCH /api/scenarios/bulk

Bulk operations trên nhiều scenarios.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "scenarioIds": ["scenario_123", "scenario_456"],
  "operation": "favorite",
  "data": {
    "tags": ["bulk-tagged"]
  }
}
```

Operations available: `delete`, `favorite`, `unfavorite`, `makePublic`, `makePrivate`

---

## Sharing Endpoints

### POST /api/share/{scenarioId}

Tạo link chia sẻ cho scenario.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Viễn cảnh thú vị của tôi",
  "description": "Một viễn cảnh rất hay về tương lai",
  "password": "optional-password",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Share link created successfully",
  "data": {
    "shareUrl": "abc123-def456-ghi789",
    "fullUrl": "http://localhost:3005/shared/abc123-def456-ghi789",
    "shortUrl": "https://short.ly/xyz123",
    "qrCodeUrl": "http://localhost:3000/qr/abc123-def456-ghi789",
    "expiresAt": "2024-12-31T23:59:59Z",
    "isPasswordProtected": true
  }
}
```

### GET /shared/{shareUrl}

Lấy scenario đã được chia sẻ.

**Query Parameters:**
- `password` (string): Mật khẩu nếu được bảo vệ

**Response:**
```json
{
  "success": true,
  "data": {
    "scenario": {
      "shareUrl": "abc123-def456-ghi789",
      "title": "Viễn cảnh thú vị",
      "description": "Mô tả scenario",
      "scenarioData": {
        "topic": "Nếu như con người có thể bay",
        "content": "Trong một thế giới...",
        "promptType": "fantasy",
        "tags": ["thú vị"],
        "generatedAt": "2024-01-01T12:00:00Z"
      },
      "viewCount": 15,
      "shareCount": 3,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### GET /api/sharing/my

Lấy danh sách scenarios đã chia sẻ của user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit`, `sort`, `order`: Pagination parameters
- `includeInactive` (boolean): Bao gồm shares đã bị deactivate

### PATCH /api/sharing/share/{shareUrl}

Cập nhật cài đặt chia sẻ.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Tiêu đề mới",
  "description": "Mô tả mới",
  "password": "new-password",
  "expiresAt": "2024-12-31T23:59:59Z",
  "isActive": false
}
```

### DELETE /api/sharing/share/{shareUrl}

Xóa chia sẻ.

**Headers:** `Authorization: Bearer <token>`

### POST /api/sharing/share/{shareUrl}/record

Ghi nhận sự kiện chia sẻ.

**Request Body:**
```json
{
  "platform": "facebook"
}
```

Platforms: `facebook`, `twitter`, `linkedin`, `whatsapp`, `telegram`, `email`, `copy`, `qr`, `other`

### GET /qr/{shareUrl}

Tạo mã QR cho link chia sẻ.

**Response:** PNG image

### GET /api/sharing/analytics

Lấy thống kê chia sẻ của user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `dateFrom` (date): Từ ngày
- `dateTo` (date): Đến ngày

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalShares": 10,
      "totalViews": 150,
      "totalShareEvents": 25,
      "activeShares": 8,
      "platformStats": {
        "facebook": 10,
        "twitter": 5,
        "copy": 8,
        "qr": 2
      }
    }
  }
}
```

---

## Reporting Endpoints

### POST /api/report

Báo cáo nội dung không phù hợp.

**Headers:** `Authorization: Bearer <token>` (optional)

**Request Body:**
```json
{
  "targetType": "shared_scenario",
  "targetId": "abc123-def456-ghi789",
  "shareUrl": "abc123-def456-ghi789",
  "scenarioId": "scenario_123",
  "reason": "inappropriate_content",
  "description": "Nội dung không phù hợp với trẻ em",
  "category": "content",
  "severity": "medium"
}
```

**Reasons:** `inappropriate_content`, `spam`, `harassment`, `violence`, `hate_speech`, `adult_content`, `misinformation`, `copyright_violation`, `other`

**Categories:** `content`, `behavior`, `technical`, `legal`

**Severities:** `low`, `medium`, `high`, `critical`

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "reportId": "report_123",
    "status": "pending",
    "priorityScore": 50
  }
}
```

### GET /api/reporting/options

Lấy danh sách tùy chọn báo cáo.

**Response:**
```json
{
  "success": true,
  "data": {
    "options": {
      "reasons": [
        {"value": "inappropriate_content", "label": "Nội dung không phù hợp"},
        {"value": "spam", "label": "Spam"}
      ],
      "categories": [
        {"value": "content", "label": "Nội dung"},
        {"value": "behavior", "label": "Hành vi"}
      ],
      "severities": [
        {"value": "low", "label": "Thấp"},
        {"value": "medium", "label": "Trung bình"}
      ]
    }
  }
}
```

---

## Health Check Endpoints

### GET /health

Gateway health check.

**Response:**
```json
{
  "success": true,
  "message": "API Gateway is healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "overallHealth": {
    "status": "healthy",
    "healthyServices": 4,
    "totalServices": 4,
    "healthPercentage": 100
  }
}
```

### GET /health/services

Lấy status của tất cả services.

**Response:**
```json
{
  "success": true,
  "data": {
    "services": {
      "user": {
        "status": "healthy",
        "url": "http://user-service:3001",
        "lastChecked": "2024-01-01T12:00:00Z",
        "responseTime": 45
      },
      "generation": {
        "status": "healthy",
        "url": "http://generation-service:3002",
        "lastChecked": "2024-01-01T12:00:00Z",
        "responseTime": 120
      }
    },
    "summary": {
      "total": 4,
      "healthy": 4,
      "unhealthy": 0
    }
  }
}
```

---

## WebSocket Events (Future Enhancement)

Future versions sẽ hỗ trợ WebSocket cho real-time updates:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws');

// Events
ws.on('scenario_generated', (data) => {
  // New scenario generated
});

ws.on('share_viewed', (data) => {
  // Someone viewed your shared scenario
});
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { WhatIfGeneratorAPI } from 'what-if-generator-sdk';

const api = new WhatIfGeneratorAPI({
  baseURL: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Generate scenario
const scenario = await api.generation.create({
  topic: 'Nếu như con người có thể bay',
  options: { promptType: 'fantasy' }
});

// Get user scenarios
const scenarios = await api.scenarios.list({
  page: 1,
  limit: 10
});
```

### Python
```python
from what_if_generator import WhatIfGeneratorClient

client = WhatIfGeneratorClient(
    base_url='http://localhost:3000',
    api_key='your-api-key'
)

# Generate scenario
scenario = client.generation.create(
    topic='Nếu như con người có thể bay',
    options={'prompt_type': 'fantasy'}
)

# Get user scenarios
scenarios = client.scenarios.list(page=1, limit=10)
```

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial release
- Full microservices architecture
- User authentication and management
- AI scenario generation
- History and sharing functionality
- Reporting system
- API Gateway with rate limiting

---

## Support

- **Documentation**: http://localhost:3000/api-docs
- **Health Status**: http://localhost:3000/health
- **GitHub Issues**: [Repository Issues]
- **Email Support**: api-support@whatifgenerator.com