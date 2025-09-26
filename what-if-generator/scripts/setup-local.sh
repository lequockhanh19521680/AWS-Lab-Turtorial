#!/bin/bash

# What If Generator - Local Development Setup Script
# This script sets up the local development environment

set -e

echo "🚀 Setting up What If Generator for local development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Create environment file if it doesn't exist
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.development" ]; then
            cp .env.development .env.local
            print_success "Created .env.local from .env.development"
            print_warning "Please review and update .env.local with your specific configuration"
        else
            print_error ".env.development file not found!"
            exit 1
        fi
    else
        print_success ".env.local already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    local directories=(
        "logs"
        "uploads"
        "outputs"
        "credentials"
        "temp"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
}

# Install dependencies for all services
install_dependencies() {
    print_status "Installing dependencies for all services..."
    
    # Root dependencies
    if [ -f "package.json" ]; then
        print_status "Installing root dependencies..."
        npm install
    fi
    
    # API Gateway dependencies
    if [ -d "api-gateway" ] && [ -f "api-gateway/package.json" ]; then
        print_status "Installing API Gateway dependencies..."
        cd api-gateway && npm install && cd ..
    fi
    
    # Service dependencies
    local services=(
        "user-service"
        "generation-service"
        "history-service"
        "sharing-service"
        "video-service"
        "social-service"
    )
    
    for service in "${services[@]}"; do
        if [ -d "services/$service" ] && [ -f "services/$service/package.json" ]; then
            print_status "Installing $service dependencies..."
            cd services/$service && npm install && cd ../..
        fi
    done
    
    # Frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    print_success "All dependencies installed"
}

# Setup DynamoDB tables
setup_dynamodb() {
    print_status "Setting up DynamoDB tables..."
    
    if [ -f "scripts/setup-dynamodb-tables.js" ]; then
        node scripts/setup-dynamodb-tables.js development
        print_success "DynamoDB tables created"
    else
        print_warning "DynamoDB setup script not found, skipping..."
    fi
}

# Start services with Docker Compose
start_services() {
    print_status "Starting services with Docker Compose..."
    
    # Stop any running containers first
    docker-compose down 2>/dev/null || true
    
    # Start infrastructure services first (databases)
    print_status "Starting infrastructure services..."
    docker-compose up -d postgres dynamodb redis
    
    # Wait a bit for databases to start
    print_status "Waiting for databases to start..."
    sleep 10
    
    # Start application services
    print_status "Starting application services..."
    docker-compose up -d
    
    print_success "All services started"
}

# Check service health
check_health() {
    print_status "Checking service health..."
    
    local services=(
        "http://localhost:3000/health"  # API Gateway
        "http://localhost:3001/health"  # User Service
        "http://localhost:3002/health"  # Generation Service
        "http://localhost:3003/health"  # History Service
        "http://localhost:3004/health"  # Sharing Service
        "http://localhost:3005/health"  # Video Service
        "http://localhost:3006/health"  # Social Service
    )
    
    local max_attempts=30
    local attempt=1
    
    for service in "${services[@]}"; do
        print_status "Checking $service..."
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s "$service" > /dev/null 2>&1; then
                print_success "$service is healthy"
                break
            else
                if [ $attempt -eq $max_attempts ]; then
                    print_warning "$service is not responding (this might be normal if the service is still starting)"
                else
                    echo -n "."
                    sleep 2
                    ((attempt++))
                fi
            fi
        done
        attempt=1
    done
}

# Display final information
display_info() {
    print_success "🎉 What If Generator setup completed!"
    echo ""
    echo "📝 Service URLs:"
    echo "  • API Gateway:      http://localhost:3000"
    echo "  • Frontend:         http://localhost:3007"  
    echo "  • API Documentation: http://localhost:3000/api-docs"
    echo "  • Health Check:     http://localhost:3000/health"
    echo ""
    echo "🗄️  Database URLs:"
    echo "  • PostgreSQL:       localhost:5432"
    echo "  • DynamoDB Local:   localhost:8000"
    echo "  • Redis:           localhost:6379"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  • View logs:        docker-compose logs -f [service-name]"
    echo "  • Stop services:    docker-compose down"
    echo "  • Restart services: docker-compose restart [service-name]"
    echo "  • Rebuild services: docker-compose up --build -d"
    echo ""
    echo "⚙️  Configuration:"
    echo "  • Environment file: .env.local"
    echo "  • Update your API keys in .env.local"
    echo "  • Check logs if any service is not working"
    echo ""
    print_warning "Don't forget to:"
    print_warning "1. Update your API keys in .env.local"
    print_warning "2. Configure your Google Cloud credentials for video service"
    print_warning "3. Set up your email SMTP settings"
}

# Main execution
main() {
    echo "=================================================="
    echo "🚀 What If Generator - Local Setup"
    echo "=================================================="
    echo ""
    
    # Change to project directory
    cd "$(dirname "$0")/.."
    
    # Run setup steps
    check_prerequisites
    setup_environment
    create_directories
    install_dependencies
    start_services
    setup_dynamodb
    
    # Wait a bit before health checks
    print_status "Waiting for services to fully start..."
    sleep 15
    
    check_health
    display_info
    
    echo ""
    echo "=================================================="
    print_success "Setup completed! Happy coding! 🎊"
    echo "=================================================="
}

# Run main function
main "$@"