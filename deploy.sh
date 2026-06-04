#!/bin/bash

# --- Vibsino Interactive Deployment Script ---

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   🎰 Vibsino Telegram Bot Deployment 🎰   ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check for prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}pnpm not found. Attempting to install via npm...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}Prerequisites met!${NC}"

# Configuration Prompts
echo -e "\n${BLUE}--- Configuration Settings ---${NC}"

# Telegram Bot Token
read -p "Enter your Telegram Bot Token (from @BotFather): " BOT_TOKEN
while [ -z "$BOT_TOKEN" ]; do
    echo -e "${RED}Error: Bot Token is required.${NC}"
    read -p "Enter your Telegram Bot Token: " BOT_TOKEN
done

# WebApp URL
read -p "Enter your WebApp URL (e.g., https://your-vibsino-app.com): " WEBAPP_URL
while [ -z "$WEBAPP_URL" ]; do
    echo -e "${RED}Error: WebApp URL is required.${NC}"
    read -p "Enter your WebApp URL: " WEBAPP_URL
done

# JWT Secret
DEFAULT_JWT_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
read -p "Enter JWT Secret (Press Enter to auto-generate): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$DEFAULT_JWT_SECRET
    echo -e "${YELLOW}Auto-generated JWT Secret: $JWT_SECRET${NC}"
fi

# Port
read -p "Enter Backend Port (Default: 3000): " PORT
PORT=${PORT:-3000}

# Backend URL for Frontend
read -p "Enter Backend URL for Frontend (Default: http://localhost:$PORT): " VITE_BACKEND_URL
VITE_BACKEND_URL=${VITE_BACKEND_URL:-http://localhost:$PORT}

# Writing .env files
echo -e "\n${YELLOW}Writing configuration files...${NC}"

# Backend .env
cat <<EOF > backend/.env
PORT=$PORT
DATABASE_URL="file:./dev.db"
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
NODE_ENV="production"
TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
WEBAPP_URL="$WEBAPP_URL"
EOF

# Webapp .env
cat <<EOF > webapp/.env
VITE_BACKEND_URL="$VITE_BACKEND_URL"
EOF

echo -e "${GREEN}Configuration files generated successfully!${NC}"

# Installation
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Database Setup
echo -e "\n${YELLOW}Setting up database...${NC}"
cd backend
pnpm prisma generate
pnpm prisma db push
cd ..

# Build
echo -e "\n${YELLOW}Building frontend...${NC}"
cd webapp
pnpm build
cd ..

echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}   ✅ Deployment Preparation Complete! ✅   ${NC}"
echo -e "${GREEN}==============================================${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Start the backend: ${YELLOW}cd backend && pnpm start${NC}"
echo -e "2. Serve the frontend (from webapp/dist) using your preferred static host."
echo -e "3. Set your bot's webhook to: ${YELLOW}$WEBAPP_URL/api/webhook${NC}"
echo -e "\n${YELLOW}To run in development mode, use: 'pnpm dev' in both directories.${NC}"
