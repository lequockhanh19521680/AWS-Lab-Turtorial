# What If Generator (Cỗ Máy "Nếu Như")

## Giới thiệu
Hệ thống "What If Generator" là một ứng dụng web cho phép người dùng tạo ra các viễn cảnh "Nếu như..." thú vị bằng cách sử dụng trí tuệ nhân tạo. Người dùng chỉ cần nhập một chủ đề và hệ thống sẽ tạo ra một câu chuyện hoặc viễn cảnh hấp dẫn.

## Kiến trúc
Hệ thống được xây dựng theo kiến trúc Microservices với các thành phần chính:

### Backend Services
- **API Gateway**: Điểm vào duy nhất cho tất cả requests
- **User Service**: Quản lý người dùng và xác thực
- **Generation Service**: Xử lý tạo viễn cảnh với LLM
- **History Service**: Lưu trữ và quản lý lịch sử viễn cảnh
- **Sharing Service**: Xử lý chia sẻ và báo cáo

### Frontend
- **React Application**: Giao diện người dùng responsive

### Databases
- **PostgreSQL**: Lưu trữ thông tin người dùng
- **MongoDB**: Lưu trữ lịch sử viễn cảnh và dữ liệu NoSQL

## Công nghệ sử dụng
- **Backend**: Node.js với Express.js
- **Frontend**: React với TypeScript
- **Databases**: PostgreSQL, MongoDB
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Authentication**: JWT
- **AI Integration**: Google Gemini API

## Cấu trúc thư mục
```
what-if-generator/
├── api-gateway/          # API Gateway service
├── services/
│   ├── user-service/     # User management service
│   ├── generation-service/ # AI scenario generation
│   ├── history-service/  # History management
│   └── sharing-service/  # Sharing and reporting
├── frontend/             # React frontend application
├── docker/               # Docker configurations
├── k8s/                  # Kubernetes configurations
├── docs/                 # Documentation
└── scripts/              # Deployment and utility scripts
```

## Use Cases Hỗ trợ
1. **UC-001**: Tạo viễn cảnh mới
2. **UC-002**: Đăng ký tài khoản
3. **UC-003**: Đăng nhập
4. **UC-004**: Xem lịch sử viễn cảnh
5. **UC-005**: Quên mật khẩu (Password Reset)
6. **UC-006**: Chia sẻ viễn cảnh
7. **UC-007**: Gắn thẻ (Tag) cho viễn cảnh
8. **UC-008**: Tìm kiếm viễn cảnh trong lịch sử
9. **UC-009**: Xóa viễn cảnh khỏi lịch sử
10. **UC-010**: Xem viễn cảnh ngẫu nhiên
11. **UC-011**: Báo cáo viễn cảnh không phù hợp
12. **UC-012**: Sao chép nội dung viễn cảnh
13. **UC-013**: Đổi mật khẩu
14. **UC-014**: Đổi email
15. **UC-015**: Xóa tài khoản
16. **UC-016**: Thay đổi cài đặt giao diện

## Yêu cầu phi chức năng
- **Performance**: Tạo viễn cảnh < 5s, load trang < 2s
- **Scalability**: 1,000 requests/minute
- **Availability**: 99.5% uptime
- **Security**: bcrypt password hashing, JWT authentication
- **Usability**: Responsive design, đa ngôn ngữ

## Cài đặt và Chạy

### Prerequisites
- Node.js 18+
- Docker và Docker Compose
- Kubernetes (minikube hoặc cloud provider)
- PostgreSQL
- MongoDB

### Development
```bash
# Clone repository
git clone <repository-url>
cd what-if-generator

# Install dependencies for all services
npm run install:all

# Start development environment
npm run dev

# Start with Docker Compose
docker-compose up -d
```

### Production
```bash
# Build Docker images
npm run build:docker

# Deploy to Kubernetes
kubectl apply -f k8s/
```

## API Documentation
API documentation được tạo tự động với Swagger/OpenAPI và có thể truy cập tại:
- Development: http://localhost:3000/api-docs
- Production: https://your-domain.com/api-docs

## Environment Variables
Xem file `.env.example` trong mỗi service để biết các biến môi trường cần thiết.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License

## Contact
- Email: support@whatifgenerator.com
- Website: https://whatifgenerator.com