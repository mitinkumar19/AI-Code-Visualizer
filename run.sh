#!/bin/bash

# AI Code Visualizer Multi-Process Runner (macOS)
# This script runs both the frontend and backend at the same time.

# Text styling
BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
GRAY='\033[90m'
NC='\033[0m' # No Color

echo -e "${BOLD}${CYAN}==================================================${NC}"
echo -e "${BOLD}${CYAN}        AI Code Visualizer - Mac Runner           ${NC}"
echo -e "${BOLD}${CYAN}==================================================${NC}"

# Get the script's directory and make it the current working directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Setup/Verify Backend Python Environment
echo -e "\n${BOLD}${YELLOW}[1/3] Verifying Backend Environment...${NC}"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment (venv) not found. Creating one...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment. Please ensure python3 is installed.${NC}"
        exit 1
    fi
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if they are missing
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}Installing backend dependencies from backend/requirements.txt...${NC}"
    pip install -r backend/requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install backend requirements.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✔ Backend dependencies installed successfully.${NC}"
else
    echo -e "${GREEN}✔ Backend dependencies are satisfied.${NC}"
fi

# 2. Setup/Verify Frontend Node Environment
echo -e "\n${BOLD}${YELLOW}[2/3] Verifying Frontend Environment...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found in frontend directory. Running npm install...${NC}"
    cd frontend && npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install frontend dependencies.${NC}"
        exit 1
    fi
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}✔ Frontend dependencies installed successfully.${NC}"
else
    echo -e "${GREEN}✔ Frontend dependencies are satisfied.${NC}"
fi

# 3. Launch Services
echo -e "\n${BOLD}${YELLOW}[3/3] Launching services...${NC}"

# Cleanup function to kill background processes on Exit/Ctrl+C
cleanup() {
    echo -e "\n\n${BOLD}${RED}Stopping services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    echo -e "${GREEN}✔ Services stopped. Goodbye!${NC}"
    exit 0
}

# Trap Ctrl+C (SIGINT) and SIGTERM to trigger cleanup
trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${CYAN}Starting Backend (FastAPI) on http://localhost:8000...${NC}"
python3 backend/app.py &
BACKEND_PID=$!

# Start Frontend
echo -e "${CYAN}Starting Frontend (Vite) on http://localhost:5173...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# Wait a brief moment to check if processes started successfully
sleep 2

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Error: Backend failed to start. Please check the logs above.${NC}"
    cleanup
fi

# Check if frontend is still running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Error: Frontend failed to start. Please check the logs above.${NC}"
    cleanup
fi

echo -e "\n${BOLD}${GREEN}✔ Both services are running successfully!${NC}"
echo -e "${BOLD}${CYAN}--------------------------------------------------${NC}"
echo -e "${BOLD}Backend API:${NC} http://localhost:8000"
echo -e "${BOLD}Frontend UI:${NC} http://localhost:5173"
echo -e "${BOLD}${CYAN}--------------------------------------------------${NC}"
echo -e "${BOLD}${YELLOW}Press [Ctrl+C] to stop both services.${NC}\n"

# Keep the script alive so the trap remains active and we can see live output
wait
