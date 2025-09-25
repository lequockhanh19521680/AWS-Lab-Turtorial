#!/bin/bash

echo "🚀 Starting What If Generator Development Environment"
echo "================================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your AI API keys before proceeding!"
    echo "   You need at least one of: OPENAI_API_KEY or GEMINI_API_KEY"
    echo ""
    read -p "Press Enter when you've configured your .env file..."
fi

# Start database
echo "🗄️  Starting database services..."
npm run dev:db

echo "⏳ Waiting for database to initialize (15 seconds)..."
sleep 15

# Install dependencies if needed
if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/api-gateway/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

echo ""
echo "🎯 Development environment is ready!"
echo ""
echo "Now run these commands in separate terminals:"
echo "1. npm run dev:api-gateway    (Port 3001)"
echo "2. npm run dev:user-service   (Port 3002)"
echo "3. npm run dev:generation-service (Port 3003)"
echo "4. npm run dev:history-service (Port 3004)"
echo "5. npm run dev:frontend       (Port 3000)"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "To stop database: npm run dev:stop"