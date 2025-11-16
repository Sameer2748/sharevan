#!/bin/bash

# Sharevan Backend Startup Script
# This script kills any process on port 5000 and starts the server

echo "🔍 Checking for processes on port 5000..."

# Kill any process using port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Killed existing process on port 5000"
else
    echo "✅ Port 5000 is free"
fi

# Wait a moment for port to be released
sleep 1

echo ""
echo "🚀 Starting Sharevan Backend..."
echo ""

# Start the server
npm run dev
