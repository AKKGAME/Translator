#!/usr/bin/env bash

# ==============================================================================
# AnimeGabar AI Subtitle Translator - 1-Click Update Script
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==> Updating AnimeGabar Subtitle Translator...${NC}"

# Pull latest code if git repo exists
if [ -d .git ]; then
  echo -e "${BLUE}==> Pulling latest changes from Git...${NC}"
  git pull origin main || git pull
fi

# Install dependencies
echo -e "${BLUE}==> Installing dependencies...${NC}"
npm install --production=false

# Build project
echo -e "${BLUE}==> Building application...${NC}"
npm run build

# Restart PM2
echo -e "${BLUE}==> Restarting PM2 process...${NC}"
pm2 restart animegabar

echo ""
echo -e "${GREEN}✅ Update completed successfully! App is running smoothly.${NC}"
echo -e "Check status with: ${BLUE}pm2 status${NC} or logs with: ${BLUE}pm2 logs animegabar${NC}"
