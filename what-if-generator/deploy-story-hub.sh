#!/bin/bash

# Story Hub MVP Deployment Script
# This script deploys the Story Hub MVP following the deployment guidelines

set -e  # Exit on any error

echo "🚀 Starting Story Hub MVP Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
DOCKER_COMPOSE_FILE="docker-compose.yml"
K8S_NAMESPACE="what-if-generator"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env files exist
    if [ ! -f "services/generation-service/.env" ]; then
        print_warning "Generation service .env file not found. Creating from example..."
        cp services/generation-service/.env.example services/generation-service/.env 2>/dev/null || true
    fi
    
    if [ ! -f "api-gateway/.env" ]; then
        print_warning "API Gateway .env file not found. Creating from example..."
        cp api-gateway/.env.example api-gateway/.env 2>/dev/null || true
    fi
    
    print_success "Prerequisites check completed"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Create .env file for the project
    cat > .env << EOF
# Story Hub MVP Environment Configuration
NODE_ENV=${ENVIRONMENT}
FRONTEND_URL=http://localhost:3005
API_GATEWAY_URL=http://localhost:3000

# Database Configuration
POSTGRES_PASSWORD=storyhub_secure_password_2024
MONGODB_PASSWORD=storyhub_mongo_secure_2024

# AI API Keys (Please update with your actual keys)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# JWT Configuration
JWT_SECRET=storyhub_jwt_secret_key_2024_very_secure

# Service URLs
USER_SERVICE_URL=http://user-service:3001
GENERATION_SERVICE_URL=http://generation-service:3002
HISTORY_SERVICE_URL=http://history-service:3003
SHARING_SERVICE_URL=http://sharing-service:3004
VIDEO_SERVICE_URL=http://video-service:3005
TTS_SERVICE_URL=http://video-service:3005

# Redis Configuration
REDIS_URL=redis://redis:6379

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3005,http://localhost:3000

# Feature Flags
ENABLE_VIDEO_GENERATION=true
ENABLE_TTS=true
ENABLE_API_DOCS=true
ENABLE_METRICS=true

# Logging
LOG_REQUESTS=true
EOF

    print_success "Environment variables configured"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build all services
    docker-compose build --no-cache
    
    print_success "Docker images built successfully"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    
    # Start all services
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check service health
    check_service_health
    
    print_success "All services started successfully"
}

# Function to check service health
check_service_health() {
    print_status "Checking service health..."
    
    # Wait for API Gateway
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            print_success "API Gateway is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "API Gateway failed to start"
            return 1
        fi
        sleep 2
    done
    
    # Wait for Frontend
    for i in {1..30}; do
        if curl -s http://localhost:3005 > /dev/null 2>&1; then
            print_success "Frontend is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Frontend failed to start"
            return 1
        fi
        sleep 2
    done
    
    # Test Story Hub endpoints
    test_story_hub_endpoints
}

# Function to test Story Hub endpoints
test_story_hub_endpoints() {
    print_status "Testing Story Hub endpoints..."
    
    # Test Story Hub health
    if curl -s http://localhost:3000/api/story-hub/health | grep -q "success"; then
        print_success "Story Hub health check passed"
    else
        print_warning "Story Hub health check failed"
    fi
    
    # Test pricing endpoint
    if curl -s http://localhost:3000/api/story-hub/pricing | grep -q "success"; then
        print_success "Story Hub pricing endpoint working"
    else
        print_warning "Story Hub pricing endpoint failed"
    fi
}

# Function to run tests
run_tests() {
    print_status "Running Story Hub tests..."
    
    # Install test dependencies
    if [ -f "package.json" ]; then
        npm install --silent
    fi
    
    # Run the test script
    if [ -f "test-story-hub-flow.js" ]; then
        node test-story-hub-flow.js
    else
        print_warning "Test script not found, skipping tests"
    fi
}

# Function to show deployment summary
show_deployment_summary() {
    echo ""
    echo "🎉 Story Hub MVP Deployment Complete!"
    echo "======================================"
    echo ""
    echo "📱 Frontend: http://localhost:3005"
    echo "🔌 API Gateway: http://localhost:3000"
    echo "📚 API Documentation: http://localhost:3000/api-docs"
    echo "🏥 Health Check: http://localhost:3000/health"
    echo ""
    echo "🎯 Story Hub Endpoints:"
    echo "   - Generate Script: POST http://localhost:3000/api/story-hub/generate-script"
    echo "   - Generate Audio: POST http://localhost:3000/api/story-hub/generate-audio"
    echo "   - Pricing Plans: GET http://localhost:3000/api/story-hub/pricing"
    echo "   - Upgrade: POST http://localhost:3000/api/story-hub/upgrade"
    echo "   - Generate Video: POST http://localhost:3000/api/video/generate-story-hub"
    echo ""
    echo "🔧 Management Commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart services: docker-compose restart"
    echo "   - View service status: docker-compose ps"
    echo ""
    echo "⚠️  Important Notes:"
    echo "   - Update AI API keys in .env files"
    echo "   - Configure payment provider for production"
    echo "   - Set up proper SSL certificates for production"
    echo "   - Configure database backups"
    echo ""
}

# Function to cleanup on error
cleanup() {
    print_error "Deployment failed. Cleaning up..."
    docker-compose down
    exit 1
}

# Set trap for cleanup on error
trap cleanup ERR

# Main deployment flow
main() {
    echo "Starting Story Hub MVP deployment for environment: $ENVIRONMENT"
    echo ""
    
    check_prerequisites
    setup_environment
    build_images
    start_services
    run_tests
    show_deployment_summary
    
    print_success "Story Hub MVP deployment completed successfully! 🎉"
}

# Run main function
main "$@"