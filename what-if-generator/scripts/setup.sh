#!/bin/bash

# What If Generator Setup Script
# This script sets up the development environment

set -e  # Exit on any error

echo "🚀 Setting up What If Generator development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_status "✓ Docker found: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_status "✓ Docker Compose found: $(docker-compose --version)"
    
    # Check Node.js (optional for local development)
    if command -v node &> /dev/null; then
        print_status "✓ Node.js found: $(node --version)"
    else
        print_warning "Node.js not found. You can still run with Docker, but local development will be limited."
    fi
    
    # Check npm (optional)
    if command -v npm &> /dev/null; then
        print_status "✓ npm found: $(npm --version)"
    fi
}

# Setup environment files
setup_environment() {
    print_step "Setting up environment files..."
    
    # Copy environment files if they don't exist
    services=("user-service" "generation-service" "history-service" "sharing-service")
    
    for service in "${services[@]}"; do
        env_file="services/$service/.env"
        example_file="services/$service/.env.example"
        
        if [ ! -f "$env_file" ]; then
            if [ -f "$example_file" ]; then
                cp "$example_file" "$env_file"
                print_status "✓ Created $env_file"
            else
                print_warning "Example file not found: $example_file"
            fi
        else
            print_status "✓ Environment file already exists: $env_file"
        fi
    done
    
    # API Gateway
    if [ ! -f "api-gateway/.env" ]; then
        cp "api-gateway/.env.example" "api-gateway/.env"
        print_status "✓ Created api-gateway/.env"
    fi
    
    # Frontend
    if [ ! -f "frontend/.env" ]; then
        echo "REACT_APP_API_URL=http://localhost:3000" > "frontend/.env"
        print_status "✓ Created frontend/.env"
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    if command -v npm &> /dev/null; then
        # Install root dependencies
        if [ -f "package.json" ]; then
            print_status "Installing root dependencies..."
            npm install
        fi
        
        # Install service dependencies
        for service in services/*/; do
            if [ -f "$service/package.json" ]; then
                print_status "Installing dependencies for $service..."
                (cd "$service" && npm install)
            fi
        done
        
        # Install API Gateway dependencies
        if [ -f "api-gateway/package.json" ]; then
            print_status "Installing API Gateway dependencies..."
            (cd "api-gateway" && npm install)
        fi
        
        # Install Frontend dependencies
        if [ -f "frontend/package.json" ]; then
            print_status "Installing Frontend dependencies..."
            (cd "frontend" && npm install)
        fi
    else
        print_warning "npm not available. Dependencies will be installed inside Docker containers."
    fi
}

# Build Docker images
build_images() {
    print_step "Building Docker images..."
    
    print_status "Building all services with Docker Compose..."
    docker-compose build --parallel
    
    print_status "✓ All Docker images built successfully"
}

# Start services
start_services() {
    print_step "Starting services..."
    
    print_status "Starting databases first..."
    docker-compose up -d postgres mongodb redis
    
    print_status "Waiting for databases to be ready..."
    sleep 30
    
    print_status "Starting application services..."
    docker-compose up -d
    
    print_status "✓ All services started"
}

# Health check
health_check() {
    print_step "Performing health checks..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Health check attempt $attempt/$max_attempts..."
        
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            print_status "✓ API Gateway is healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Health check failed after $max_attempts attempts"
            print_error "Please check the logs: docker-compose logs"
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # Check individual services
    services=("user-service:3001" "generation-service:3002" "history-service:3003" "sharing-service:3004")
    
    for service_port in "${services[@]}"; do
        service_name=${service_port%:*}
        port=${service_port#*:}
        
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_status "✓ $service_name is healthy"
        else
            print_warning "⚠ $service_name health check failed"
        fi
    done
}

# Display information
display_info() {
    print_step "Setup completed successfully! 🎉"
    echo ""
    echo "📋 Service Information:"
    echo "  • API Gateway:        http://localhost:3000"
    echo "  • API Documentation:  http://localhost:3000/api-docs"
    echo "  • Frontend:           http://localhost:3005"
    echo "  • User Service:       http://localhost:3001"
    echo "  • Generation Service: http://localhost:3002"
    echo "  • History Service:    http://localhost:3003"
    echo "  • Sharing Service:    http://localhost:3004"
    echo ""
    echo "💾 Database Information:"
    echo "  • PostgreSQL:         localhost:5432"
    echo "  • MongoDB:            localhost:27017"
    echo "  • Redis:              localhost:6379"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • View logs:          docker-compose logs -f [service-name]"
    echo "  • Stop services:      docker-compose down"
    echo "  • Restart services:   docker-compose restart [service-name]"
    echo "  • Update services:    docker-compose build && docker-compose up -d"
    echo ""
    echo "📚 Next Steps:"
    echo "  1. Update API keys in environment files"
    echo "  2. Configure email settings for notifications"
    echo "  3. Test the application at http://localhost:3005"
    echo "  4. Check API documentation at http://localhost:3000/api-docs"
    echo ""
    echo "🔑 Default Admin Account:"
    echo "  • Email: admin@whatifgenerator.com"
    echo "  • Password: admin123"
    echo "  ⚠️  Please change this password in production!"
    echo ""
    print_status "Happy coding! 🚀"
}

# Setup options
setup_minimal() {
    check_prerequisites
    setup_environment
    print_status "Minimal setup completed. Run 'docker-compose up' to start services."
}

setup_full() {
    check_prerequisites
    setup_environment
    install_dependencies
    build_images
    start_services
    health_check
    display_info
}

# Main script logic
main() {
    echo "What If Generator Setup Script"
    echo "=============================="
    echo ""
    
    if [ "$1" = "--minimal" ]; then
        setup_minimal
    elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --minimal    Setup environment files only"
        echo "  --help, -h   Show this help message"
        echo ""
        echo "Default: Full setup (environment + build + start)"
        exit 0
    else
        setup_full
    fi
}

# Run main function with all arguments
main "$@"