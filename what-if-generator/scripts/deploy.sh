#!/bin/bash

# What If Generator - Deployment Script
# Supports: development, test, production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${1:-development}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|test|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [development|test|production]"
    exit 1
fi

echo -e "${BLUE}🚀 Deploying What If Generator to $ENVIRONMENT environment${NC}"
echo -e "${BLUE}📍 AWS Region: $AWS_REGION${NC}"
echo -e "${BLUE}📁 Project Root: $PROJECT_ROOT${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js.${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}🏗️  Deploying infrastructure...${NC}"
    
    cd "$PROJECT_ROOT/aws"
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file infrastructure.yaml \
        --stack-name "what-if-generator-$ENVIRONMENT" \
        --parameter-overrides Environment="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
}

# Deploy with CDK
deploy_cdk() {
    echo -e "${YELLOW}🏗️  Deploying with CDK...${NC}"
    
    cd "$PROJECT_ROOT/aws/cdk"
    
    # Install dependencies
    npm install
    
    # Build CDK
    npm run build
    
    # Deploy CDK stack
    case $ENVIRONMENT in
        development)
            npm run deploy:dev
            ;;
        test)
            npm run deploy:test
            ;;
        production)
            npm run deploy:prod
            ;;
    esac
    
    echo -e "${GREEN}✅ CDK deployment completed${NC}"
}

# Build and push Docker images
build_and_push_images() {
    echo -e "${YELLOW}🐳 Building and pushing Docker images...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Get ECR repository URL
    ECR_REGISTRY=$(aws ecr describe-repositories --repository-names "what-if-generator-$ENVIRONMENT" --region "$AWS_REGION" --query 'repositories[0].repositoryUri' --output text 2>/dev/null || echo "")
    
    if [ -z "$ECR_REGISTRY" ]; then
        echo -e "${YELLOW}📦 Creating ECR repository...${NC}"
        aws ecr create-repository --repository-name "what-if-generator-$ENVIRONMENT" --region "$AWS_REGION"
        ECR_REGISTRY=$(aws ecr describe-repositories --repository-names "what-if-generator-$ENVIRONMENT" --region "$AWS_REGION" --query 'repositories[0].repositoryUri' --output text)
    fi
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
    
    # Build and push images
    services=("api-gateway" "user-service" "generation-service" "history-service" "sharing-service" "video-service" "social-service" "frontend")
    
    for service in "${services[@]}"; do
        echo -e "${BLUE}🔨 Building $service...${NC}"
        
        if [ "$service" = "api-gateway" ]; then
            docker build -t "$ECR_REGISTRY/$service:latest" "./api-gateway"
        elif [ "$service" = "frontend" ]; then
            docker build -t "$ECR_REGISTRY/$service:latest" "./frontend"
        else
            docker build -t "$ECR_REGISTRY/$service:latest" "./services/$service"
        fi
        
        echo -e "${BLUE}📤 Pushing $service...${NC}"
        docker push "$ECR_REGISTRY/$service:latest"
    done
    
    echo -e "${GREEN}✅ Docker images built and pushed successfully${NC}"
}

# Deploy services
deploy_services() {
    echo -e "${YELLOW}🚀 Deploying services...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Update ECS services
    CLUSTER_NAME="what-if-generator-$ENVIRONMENT-cluster"
    
    # Get service names
    SERVICES=$(aws ecs list-services --cluster "$CLUSTER_NAME" --region "$AWS_REGION" --query 'serviceArns[]' --output text)
    
    for service in $SERVICES; do
        echo -e "${BLUE}🔄 Updating service: $service${NC}"
        aws ecs update-service --cluster "$CLUSTER_NAME" --service "$service" --force-new-deployment --region "$AWS_REGION"
    done
    
    echo -e "${GREEN}✅ Services deployed successfully${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm install
    
    # Run unit tests
    npm run test:unit
    
    # Run integration tests
    npm run test:integration
    
    echo -e "${GREEN}✅ Tests passed successfully${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}🏥 Performing health check...${NC}"
    
    # Get load balancer DNS
    LB_DNS=$(aws cloudformation describe-stacks --stack-name "what-if-generator-$ENVIRONMENT" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text 2>/dev/null || echo "")
    
    if [ -n "$LB_DNS" ]; then
        echo -e "${BLUE}🔍 Checking health endpoint: http://$LB_DNS/health${NC}"
        
        # Wait for services to be ready
        sleep 30
        
        # Check health endpoint
        if curl -f "http://$LB_DNS/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${RED}❌ Health check failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Load balancer DNS not found, skipping health check${NC}"
    fi
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    # Add cleanup logic here if needed
}

# Main deployment flow
main() {
    trap cleanup EXIT
    
    check_prerequisites
    
    case $ENVIRONMENT in
        development)
            echo -e "${BLUE}🔧 Development deployment${NC}"
            run_tests
            build_and_push_images
            deploy_cdk
            deploy_services
            health_check
            ;;
        test)
            echo -e "${BLUE}🧪 Test deployment${NC}"
            run_tests
            build_and_push_images
            deploy_cdk
            deploy_services
            health_check
            ;;
        production)
            echo -e "${BLUE}🚀 Production deployment${NC}"
            echo -e "${YELLOW}⚠️  Production deployment requires manual approval${NC}"
            read -p "Are you sure you want to deploy to production? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                echo -e "${RED}❌ Production deployment cancelled${NC}"
                exit 1
            fi
            
            run_tests
            build_and_push_images
            deploy_cdk
            deploy_services
            health_check
            ;;
    esac
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}📊 Check CloudWatch logs for service status${NC}"
    echo -e "${BLUE}🔗 Access your application at the load balancer DNS${NC}"
}

# Run main function
main "$@"