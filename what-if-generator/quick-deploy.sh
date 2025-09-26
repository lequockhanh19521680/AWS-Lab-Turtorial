#!/bin/bash

# Quick Deploy Script - Super Simple Deployment
# Just run: ./quick-deploy.sh [dev|test|prod]

echo "🚀 What If Generator - Quick Deploy"
echo "=================================="

ENVIRONMENT=${1:-dev}

case $ENVIRONMENT in
    dev)
        echo "📦 Deploying to Development..."
        ./deploy.sh dev --skip-tests
        ;;
    test)
        echo "🧪 Deploying to Test..."
        ./deploy.sh test
        ;;
    prod)
        echo "🌟 Deploying to Production..."
        echo "⚠️  This will deploy to PRODUCTION. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            ./deploy.sh prod
        else
            echo "❌ Production deployment cancelled"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [dev|test|prod]"
        exit 1
        ;;
esac