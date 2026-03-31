#!/bin/bash

# Scout Gear Management System - Local Development Server Restart Script
# This script kills all running frontend and backend servers and restarts them

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Scout Gear Management - Restarting Servers${NC}"
echo "=================================================="

# Get the project root directory (parent of utils)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${YELLOW}📁 Project root: $PROJECT_ROOT${NC}"

# Function to kill processes by name pattern
kill_processes() {
    local pattern="$1"
    local description="$2"
    
    echo -e "${YELLOW}🔍 Looking for $description processes...${NC}"
    
    # Find processes matching the pattern
    local pids=$(ps aux | grep -E "$pattern" | grep -v grep | awk '{print $2}')
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✅ No $description processes found${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}🛑 Found $description processes: $pids${NC}"
    
    # Kill the processes
    for pid in $pids; do
        echo -e "${YELLOW}   Killing process $pid...${NC}"
        kill "$pid" 2>/dev/null || true
    done
    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Force kill if still running
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${RED}   Force killing process $pid...${NC}"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
    
    echo -e "${GREEN}✅ $description processes terminated${NC}"
}

# Kill existing servers
echo -e "\n${BLUE}🛑 Stopping existing servers...${NC}"
kill_processes "node server.js" "backend"
kill_processes "vite" "frontend"
kill_processes "npm run dev" "npm dev"

# Wait a moment for cleanup
sleep 1

# Start backend server
echo -e "\n${BLUE}🚀 Starting backend server...${NC}"
cd "$BACKEND_DIR"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Backend package.json not found at $BACKEND_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Backend directory: $BACKEND_DIR${NC}"
nohup node server.js > server.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend server started (PID: $BACKEND_PID)${NC}"

# Start frontend server
echo -e "\n${BLUE}🚀 Starting frontend server...${NC}"
cd "$FRONTEND_DIR"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Frontend package.json not found at $FRONTEND_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Frontend directory: $FRONTEND_DIR${NC}"
nohup npm run dev > dev.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend server started (PID: $FRONTEND_PID)${NC}"

# Wait a moment for servers to start
echo -e "\n${YELLOW}⏳ Waiting for servers to start...${NC}"
sleep 3

# Check if servers are running
echo -e "\n${BLUE}🔍 Checking server status...${NC}"

# Check backend
if kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo -e "${GREEN}✅ Backend server is running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ Backend server failed to start${NC}"
    echo -e "${YELLOW}📋 Backend logs:${NC}"
    tail -10 "$BACKEND_DIR/server.log" 2>/dev/null || echo "No logs available"
fi

# Check frontend
if kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend server is running (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ Frontend server failed to start${NC}"
    echo -e "${YELLOW}📋 Frontend logs:${NC}"
    tail -10 "$FRONTEND_DIR/dev.log" 2>/dev/null || echo "No logs available"
fi

echo -e "\n${GREEN}🎉 Server restart complete!${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "\n${YELLOW}💡 To view logs:${NC}"
echo -e "   Backend:  tail -f $BACKEND_DIR/server.log"
echo -e "   Frontend: tail -f $FRONTEND_DIR/dev.log"
echo -e "\n${YELLOW}💡 To stop servers:${NC}"
echo -e "   kill $BACKEND_PID $FRONTEND_PID"
