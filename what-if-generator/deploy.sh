#!/bin/bash

# What If Generator - Super Easy Deployment Script
# This script deploys the entire system with just a few commands
# Usage: ./deploy.sh [environment] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-dev}"
FORCE_BUILD="${2:-false}"
SKIP_TESTS="${3:-false}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Print header
print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║               What If Generator - Easy Deploy                  ║"
    echo "║                     Cỗ Máy Nếu Như                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print step
print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

# Print success
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Print error
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print info
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        dev|test|prod)
            print_info "Deploying to environment: $ENVIRONMENT"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Valid environments: dev, test, prod"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if required tools are installed
    local required_tools=("docker" "docker-compose" "aws" "kubectl" "npm")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install missing tools and try again"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        print_error "Please run 'aws configure' and try again"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        print_error "Please start Docker and try again"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Setup environment
setup_environment() {
    print_step "Setting up environment configuration..."
    
    # Copy appropriate environment file
    if [ -f ".env.${ENVIRONMENT}" ]; then
        cp ".env.${ENVIRONMENT}" .env
        print_success "Environment file (.env.${ENVIRONMENT}) copied to .env"
    else
        print_error "Environment file .env.${ENVIRONMENT} not found"
        exit 1
    fi
    
    # Load environment variables
    export $(grep -v '^#' .env | xargs)
    
    print_success "Environment configured for: $ENVIRONMENT"
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install service dependencies in parallel
    print_info "Installing backend service dependencies..."
    npm run install:services &
    
    # Install frontend dependencies
    print_info "Installing frontend dependencies..."
    npm run install:frontend &
    
    # Install API gateway dependencies
    print_info "Installing API gateway dependencies..."
    npm run install:gateway &
    
    # Wait for all installations to complete
    wait
    
    print_success "All dependencies installed!"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_info "Skipping tests (--skip-tests flag provided)"
        return
    fi
    
    print_step "Running tests..."
    
    # Run linting
    print_info "Running linting..."
    npm run lint || true
    
    # Run unit tests
    print_info "Running unit tests..."
    npm run test:unit || {
        print_error "Unit tests failed"
        if [ "$ENVIRONMENT" = "prod" ]; then
            exit 1
        else
            print_info "Continuing deployment despite test failures (non-production environment)"
        fi
    }
    
    # Run integration tests for non-local environments
    if [ "$ENVIRONMENT" != "dev" ]; then
        print_info "Running integration tests..."
        npm run test:integration || {
            print_error "Integration tests failed"
            if [ "$ENVIRONMENT" = "prod" ]; then
                exit 1
            fi
        }
    fi
    
    print_success "Tests completed!"
}

# Build and push Docker images
build_and_push_images() {
    print_step "Building and pushing Docker images..."
    
    # Get AWS account ID and ECR login
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Login to ECR
    print_info "Logging in to Amazon ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    # Build images
    if [ "$FORCE_BUILD" = "true" ] || [ ! "$(docker images -q)" ]; then
        print_info "Building Docker images..."
        docker-compose build --parallel
    else
        print_info "Using existing Docker images (use --force-build to rebuild)"
    fi
    
    # Tag and push images for non-dev environments
    if [ "$ENVIRONMENT" != "dev" ]; then
        print_info "Tagging and pushing images to ECR..."
        
        COMMIT_HASH=$(git rev-parse --short HEAD || echo "latest")
        IMAGE_TAG="${ENVIRONMENT}-${COMMIT_HASH}"
        
        # List of services
        services=("api-gateway" "user-service" "generation-service" "history-service" "sharing-service" "video-service" "social-service" "frontend")
        
        for service in "${services[@]}"; do
            print_info "Processing $service..."
            
            # Tag image
            docker tag "what-if-generator_${service}:latest" "${ECR_REGISTRY}/what-if-generator/${service}:${IMAGE_TAG}"
            docker tag "what-if-generator_${service}:latest" "${ECR_REGISTRY}/what-if-generator/${service}:latest"
            
            # Push image
            docker push "${ECR_REGISTRY}/what-if-generator/${service}:${IMAGE_TAG}"
            docker push "${ECR_REGISTRY}/what-if-generator/${service}:latest"
        done
    fi
    
    print_success "Docker images built and pushed!"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_step "Deploying infrastructure..."
    
    STACK_NAME="what-if-generator-${ENVIRONMENT}"
    
    # Deploy infrastructure stack
    print_info "Deploying CloudFormation stack: $STACK_NAME"
    aws cloudformation deploy \
        --template-file aws/infrastructure.yaml \
        --stack-name $STACK_NAME \
        --parameter-overrides Environment=$ENVIRONMENT \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --no-fail-on-empty-changeset
    
    print_success "Infrastructure deployed!"
}

# Deploy application
deploy_application() {
    print_step "Deploying application..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        # For dev environment, use docker-compose
        print_info "Starting services with docker-compose..."
        docker-compose down --remove-orphans
        docker-compose up -d
        
        # Wait for services to be healthy
        print_info "Waiting for services to be healthy..."
        sleep 30
        
        # Check service health
        check_service_health "http://localhost:3000/health" "API Gateway"
        check_service_health "http://localhost:8080" "Frontend"
        
    else
        # For test/prod environments, deploy to ECS
        print_info "Deploying to AWS ECS..."
        
        # Update ECS services
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        CLUSTER_NAME="what-if-generator-${ENVIRONMENT}"
        
        services=("api-gateway" "user-service" "generation-service" "history-service" "sharing-service" "video-service" "social-service")
        
        for service in "${services[@]}"; do
            print_info "Updating ECS service: $service"
            aws ecs update-service \
                --cluster $CLUSTER_NAME \
                --service "${service}-service" \
                --force-new-deployment \
                --region $AWS_REGION > /dev/null
        done
        
        # Deploy frontend to S3 and CloudFront
        deploy_frontend_to_s3
    fi
    
    print_success "Application deployed!"
}

# Deploy frontend to S3
deploy_frontend_to_s3() {
    print_step "Deploying frontend to S3..."
    
    # Build frontend for production
    cd frontend
    npm run build
    
    # Upload to S3
    BUCKET_NAME="what-if-generator-${ENVIRONMENT}-frontend"
    aws s3 sync build/ s3://$BUCKET_NAME --delete
    
    # Invalidate CloudFront cache
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "what-if-generator-${ENVIRONMENT}" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$DISTRIBUTION_ID" != "None" ] && [ -n "$DISTRIBUTION_ID" ]; then
        print_info "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*" > /dev/null
    fi
    
    cd ..
    print_success "Frontend deployed to S3!"
}

# Check service health
check_service_health() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Checking health of $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --connect-timeout 5 $url > /dev/null 2>&1; then
            print_success "$service_name is healthy!"
            return 0
        fi
        
        print_info "Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 10
        ((attempt++))
    done
    
    print_error "$service_name failed health check"
    return 1
}

# Setup secrets in AWS
setup_secrets() {
    print_step "Setting up AWS secrets..."
    
    # Only setup secrets for non-dev environments
    if [ "$ENVIRONMENT" = "dev" ]; then
        print_info "Skipping AWS secrets setup for dev environment"
        return
    fi
    
    # Create secrets if they don't exist
    secrets=(
        "what-if-generator-${ENVIRONMENT}/database"
        "what-if-generator-${ENVIRONMENT}/jwt"
        "what-if-generator-${ENVIRONMENT}/api-keys"
        "what-if-generator-${ENVIRONMENT}/email"
        "what-if-generator-${ENVIRONMENT}/session"
        "what-if-generator-${ENVIRONMENT}/seed"
    )
    
    for secret in "${secrets[@]}"; do
        if ! aws secretsmanager describe-secret --secret-id "$secret" --region $AWS_REGION &> /dev/null; then
            print_info "Creating secret: $secret"
            aws secretsmanager create-secret \
                --name "$secret" \
                --description "Secrets for What If Generator ${ENVIRONMENT} environment" \
                --region $AWS_REGION > /dev/null
        else
            print_info "Secret already exists: $secret"
        fi
    done
    
    print_success "AWS secrets configured!"
}

# Post-deployment tasks
post_deployment() {
    print_step "Running post-deployment tasks..."
    
    # Wait a bit for services to fully start
    sleep 10
    
    # Run database migrations/seeds if needed
    if [ "$ENVIRONMENT" = "dev" ]; then
        print_info "Running auto-seed for dev environment..."
        docker-compose exec user-service npm run seed || true
    fi
    
    # Show deployment info
    show_deployment_info
    
    print_success "Post-deployment tasks completed!"
}

# Show deployment information
show_deployment_info() {
    print_step "Deployment Information"
    
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    Deployment Successful!                     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo ""
        echo "Local Development URLs:"
        echo "  🌐 Frontend: http://localhost:8080"
        echo "  🔗 API Gateway: http://localhost:3000"
        echo "  📚 API Docs: http://localhost:3000/api-docs"
        echo "  🏥 Health Check: http://localhost:3000/health"
        echo ""
        echo "Services Status:"
        docker-compose ps
    else
        # Get outputs from CloudFormation
        STACK_NAME="what-if-generator-${ENVIRONMENT}"
        ALB_DNS=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[?OutputKey==`ApplicationLoadBalancerDNS`].OutputValue' \
            --output text \
            --region $AWS_REGION 2>/dev/null || echo "Not available")
        
        CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
            --stack-name $STACK_NAME \
            --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionDomain`].OutputValue' \
            --output text \
            --region $AWS_REGION 2>/dev/null || echo "Not available")
        
        echo ""
        echo "Production URLs:"
        echo "  🌐 Frontend: https://$CLOUDFRONT_DOMAIN"
        echo "  🔗 API: https://$ALB_DNS"
        echo "  📚 API Docs: https://$ALB_DNS/api-docs"
    fi
    
    echo ""
    echo "To check logs:"
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "  docker-compose logs -f [service-name]"
    else
        echo "  aws logs tail /aws/ecs/what-if-generator-${ENVIRONMENT} --follow"
    fi
}

# Cleanup function
cleanup() {
    print_info "Cleaning up temporary files..."
    rm -f .env
}

# Error handler
error_handler() {
    print_error "Deployment failed on line $1"
    cleanup
    exit 1
}

# Set error trap
trap 'error_handler $LINENO' ERR

# Main deployment flow
main() {
    print_header
    
    # Parse additional options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force-build)
                FORCE_BUILD="true"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
    
    validate_environment
    check_prerequisites
    setup_environment
    install_dependencies
    
    # Only run tests for non-dev or if explicitly requested
    if [ "$ENVIRONMENT" != "dev" ] || [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    build_and_push_images
    
    # Setup AWS resources for non-dev environments
    if [ "$ENVIRONMENT" != "dev" ]; then
        setup_secrets
        deploy_infrastructure
    fi
    
    deploy_application
    post_deployment
    
    cleanup
    
    print_success "🎉 Deployment completed successfully!"
}

# Show help
show_help() {
    echo "What If Generator - Easy Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  dev      - Local development environment (default)"
    echo "  test     - Test environment on AWS"
    echo "  prod     - Production environment on AWS"
    echo ""
    echo "Options:"
    echo "  --force-build    Force rebuild of Docker images"
    echo "  --skip-tests     Skip running tests"
    echo "  --help, -h       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy to dev environment"
    echo "  $0 test                     # Deploy to test environment"
    echo "  $0 prod --force-build       # Deploy to prod with force rebuild"
    echo "  $0 dev --skip-tests         # Deploy to dev without running tests"
}

# Run main function
main "$@"