# Cỗ Máy "Nếu Như" - What If Generator 🚀

Một ứng dụng web AI sáng tạo cho phép tạo ra những viễn cảnh "Nếu như..." thú vị và độc đáo.

## 📋 Tổng quan

What If Generator là một nền tảng giải trí sử dụng trí tuệ nhân tạo để tạo ra những câu chuyện "Nếu như..." sáng tạo dựa trên chủ đề mà người dùng nhập vào. Dự án được xây dựng với kiến trúc microservices hiện đại, giao diện Next.js và tích hợp AI.

### ✨ Tính năng chính

- 🤖 **Tạo viễn cảnh AI**: Sử dụng OpenAI GPT và Google Gemini để tạo nội dung
- 👤 **Xác thực người dùng**: Đăng ký/đăng nhập an toàn với JWT
- 📚 **Lịch sử cá nhân**: Lưu và xem lại các viễn cảnh đã tạo
- 📱 **Responsive Design**: Tương thích hoàn hảo với mobile
- 🚀 **Microservices**: Kiến trúc có thể mở rộng và bảo trì dễ dàng
- 🔒 **Bảo mật**: Mã hóa mật khẩu, rate limiting, content filtering

## 🏗️ Kiến trúc hệ thống

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │────│ API Gateway │────│   Services  │
│  (Next.js)  │    │  (Express)  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                    │
                           ▼                    ▼
                   ┌─────────────┐    ┌─────────────┐
                   │   Redis     │    │ PostgreSQL  │
                   │  (Cache)    │    │ (Database)  │
                   └─────────────┘    └─────────────┘
```

### 📦 Microservices

1. **API Gateway** (Port 3001): Điều hướng requests và rate limiting
2. **User Service** (Port 3002): Xác thực và quản lý người dùng
3. **Generation Service** (Port 3003): Tích hợp AI và tạo nội dung
4. **History Service** (Port 3004): Quản lý lịch sử viễn cảnh
5. **Frontend** (Port 3000): Giao diện người dùng Next.js

## 🚀 Hướng dẫn cài đặt

### Yêu cầu hệ thống

- Node.js 18+
- Docker & Docker Compose
- npm hoặc yarn

### 1. Clone repository

```bash
git clone <repository-url>
cd what-if-generator
```

### 2. Cấu hình environment

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với các API keys của bạn:

```env
# AI API Keys (cần ít nhất một trong hai)
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Database (có thể giữ nguyên cho development)
POSTGRES_DB=whatif_main
POSTGRES_USER=whatif_user
POSTGRES_PASSWORD=whatif_password

# Security (thay đổi trong production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Cài đặt dependencies

```bash
npm run install:all
```

### 4. Khởi động database

```bash
npm run dev:db
```

### 5. Khởi động services (trong các terminal riêng biệt)

```bash
# Terminal 1: API Gateway
npm run dev:api-gateway

# Terminal 2: User Service
npm run dev:user-service

# Terminal 3: Generation Service
npm run dev:generation-service

# Terminal 4: History Service
npm run dev:history-service

# Terminal 5: Frontend
npm run dev:frontend
```

### 6. Truy cập ứng dụng

Mở trình duyệt và truy cập: http://localhost:3000

## 🐳 Docker Deployment

### Khởi động với Docker Compose

```bash
# Build và khởi động tất cả services
docker-compose up --build

# Chạy background
docker-compose up -d

# Xem logs
npm run docker:logs

# Dừng services
npm run docker:down
```

## 📖 API Documentation

### User Service (Port 3002)

- `POST /auth/register` - Đăng ký tài khoản mới
- `POST /auth/login` - Đăng nhập
- `GET /auth/me` - Lấy thông tin người dùng hiện tại

### Generation Service (Port 3003)

- `POST /generate` - Tạo viễn cảnh mới

### History Service (Port 3004)

- `GET /scenarios/history` - Lấy lịch sử viễn cảnh
- `GET /scenarios/:id` - Lấy viễn cảnh cụ thể
- `DELETE /scenarios/:id` - Xóa viễn cảnh

### API Gateway (Port 3001)

Tất cả các API calls từ frontend đều đi qua API Gateway:

- `/auth/*` → User Service
- `/scenarios/generate` → Generation Service
- `/scenarios/*` → History Service

## 🛠️ Development Scripts

```bash
# Cài đặt dependencies cho tất cả services
npm run install:all

# Build tất cả services
npm run build:all

# Khởi động database development
npm run dev:db

# Khởi động từng service riêng lẻ
npm run dev:api-gateway
npm run dev:user-service
npm run dev:generation-service
npm run dev:history-service
npm run dev:frontend

# Docker commands
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs
```

## 🔧 Cấu hình nâng cao

### Database

Hệ thống sử dụng PostgreSQL với hai database riêng biệt:
- `whatif_users`: Lưu thông tin người dùng
- `whatif_history`: Lưu lịch sử viễn cảnh

### AI Integration

Hệ thống hỗ trợ nhiều AI providers:

1. **Google Gemini** (ưu tiên đầu tiên)
2. **OpenAI GPT-3.5** (fallback)
3. **Mock responses** (khi không có API key)

### Rate Limiting

- API Gateway: 100 requests/15 phút
- Generation endpoint: 5 requests/phút
- Bảo vệ chống spam và abuse

### Security Features

- Mật khẩu hash với bcrypt (12 rounds)
- JWT tokens cho authentication
- Helmet.js cho security headers
- CORS protection
- Input validation với Joi
- Content filtering cho AI responses

## 📁 Cấu trúc project

```
what-if-generator/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities và API
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── api-gateway/         # API Gateway service
│   ├── user-service/        # Authentication service
│   ├── generation-service/  # AI generation service
│   └── history-service/     # History management service
├── database/
│   └── init.sql            # Database initialization
├── docker-compose.yml      # Production deployment
├── docker-compose.dev.yml  # Development database
├── .env.example           # Environment template
└── README.md              # Tài liệu này
```

## 🎨 UI/UX Features

- **Thiết kế tối giản**: Clean, modern interface
- **Responsive**: Tương thích với mọi thiết bị
- **Animation**: Smooth transitions và loading states
- **Vietnamese**: Hoàn toàn bằng tiếng Việt
- **Dark/Light theme**: Hỗ trợ cả hai chế độ
- **Loading states**: UX feedback rõ ràng

## 🚀 Production Deployment

### Environment Variables

Đảm bảo cấu hình đúng các biến môi trường production:

```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
DATABASE_URL=your-production-database-url
REDIS_URL=your-production-redis-url
```

### Performance Optimizations

- **Database**: Connection pooling và indexing
- **Caching**: Redis cho session và frequent queries
- **CDN**: Static assets delivery
- **Load balancing**: Nginx reverse proxy
- **Monitoring**: Health checks cho tất cả services

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📝 License

Dự án được phát hành dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 🆘 Troubleshooting

### Lỗi thường gặp

1. **Database connection failed**
   ```bash
   npm run dev:db
   # Đợi 10-15 giây để database khởi động hoàn toàn
   ```

2. **Port already in use**
   ```bash
   # Kiểm tra port đang sử dụng
   lsof -i :3000
   # Kill process nếu cần
   kill -9 <PID>
   ```

3. **AI API not working**
   - Kiểm tra API keys trong file `.env`
   - Đảm bảo có credit/quota đủ
   - Hệ thống sẽ fallback sang mock responses

4. **Frontend không kết nối được backend**
   - Kiểm tra `NEXT_PUBLIC_API_URL` trong `.env`
   - Đảm bảo API Gateway đang chạy trên port 3001

### Logs và Debug

```bash
# Xem logs của tất cả services
npm run docker:logs

# Xem logs cụ thể
docker-compose logs -f frontend
docker-compose logs -f api-gateway
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra phần Troubleshooting ở trên
2. Xem Issues trên GitHub
3. Tạo Issue mới với thông tin chi tiết

---

**Cảm ơn bạn đã sử dụng What If Generator! 🎉**

Hãy khám phá những viễn cảnh thú vị và để trí tưởng tượng bay xa! ✨