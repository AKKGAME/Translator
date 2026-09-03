#!/usr/bin/env bash

# ==============================================================================
# AnimeGabar AI Subtitle Translator - 1-Click Ubuntu VPS Setup Script
# Compatible with: Ubuntu 20.04 / 22.04 / 24.04 LTS (DigitalOcean, Hetzner, AWS, Linode)
# ==============================================================================

set -e

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=================================================================="
echo "    AnimeGabar AI Subtitle Translator - VPS Auto-Installer       "
echo "             DigitalOcean / Ubuntu 1-Click Setup                  "
echo "=================================================================="
echo -e "${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[Error] Please run this script as root or with sudo:${NC}"
  echo "sudo bash install.sh"
  exit 1
fi

# Detect Current Directory
APP_DIR=$(pwd)
echo -e "${BLUE}==>${NC} Installing in: ${PURPLE}${APP_DIR}${NC}"

# Detect Public IP
SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "YOUR_VPS_IP")

echo ""
echo -e "${YELLOW}--- [Configuration Setup] ---${NC}"
read -p "Enter Domain Name (leave empty to use VPS IP: $SERVER_IP): " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-$SERVER_IP}

read -p "Enter Gemini API Key (Optional, or press Enter to set in Web UI): " USER_GEMINI_KEY
read -p "Enter Admin Password (Default: admin123): " USER_ADMIN_PWD
USER_ADMIN_PWD=${USER_ADMIN_PWD:-admin123}

echo ""
echo -e "${BLUE}==> [1/6] Updating System & Installing Prerequisites...${NC}"
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

# 2. Install Node.js 22 LTS (via NodeSource)
echo -e "${BLUE}==> [2/6] Installing Node.js 22 LTS & PM2...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo -e "${GREEN}Node.js $(node -v) & NPM $(npm -v) installed.${NC}"

# Install PM2 globally
npm install -g pm2

# 3. Setup .env file
echo -e "${BLUE}==> [3/6] Setting up Environment Variables (.env)...${NC}"
if [ ! -f "${APP_DIR}/.env" ]; then
  cat <<EOF > "${APP_DIR}/.env"
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=${USER_GEMINI_KEY}
ADMIN_PASSWORD=${USER_ADMIN_PWD}
EOF
  echo -e "${GREEN}.env created successfully.${NC}"
else
  echo -e "${YELLOW}.env file already exists, keeping existing file.${NC}"
fi

# Ensure data directory exists with write permissions
mkdir -p "${APP_DIR}/data"
mkdir -p "${APP_DIR}/data/saved_subtitles"
chmod -R 775 "${APP_DIR}/data"

# 4. Install Dependencies & Build Project
echo -e "${BLUE}==> [4/6] Installing npm packages and building application...${NC}"
cd "${APP_DIR}"
npm install --production=false
npm run build

# 5. Configure PM2 Process Manager
echo -e "${BLUE}==> [5/6] Starting application with PM2...${NC}"
pm2 delete animegabar 2>/dev/null || true
pm2 start dist/server.cjs --name "animegabar"
pm2 save

# Setup PM2 Startup on Boot
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root || pm2 startup

# 6. Configure Nginx Reverse Proxy
echo -e "${BLUE}==> [6/6] Configuring Nginx Reverse Proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/animegabar"

cat <<EOF > "$NGINX_CONF"
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Maximum file upload size for big video/subtitle files
    client_max_body_size 100M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
}
EOF

# Enable Nginx Site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test & Reload Nginx
nginx -t
systemctl restart nginx

# Firewall Setup
echo -e "${BLUE}==> Configuring UFW Firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Optional SSL via Certbot if domain was provided and not raw IP
if [ "$DOMAIN_NAME" != "$SERVER_IP" ] && [[ "$DOMAIN_NAME" =~ \.[a-zA-Z]{2,}$ ]]; then
  echo ""
  echo -e "${YELLOW}Detected domain name ($DOMAIN_NAME). Setting up Free SSL via Let's Encrypt Certbot...${NC}"
  certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "admin@$DOMAIN_NAME" --redirect || true
fi

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}  🎉 INSTALLATION COMPLETE! Your App is now LIVE!                 ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo ""
if [ "$DOMAIN_NAME" != "$SERVER_IP" ]; then
  echo -e "  🌐 Website URL:    ${CYAN}http://${DOMAIN_NAME}${NC} (or https://${DOMAIN_NAME})"
else
  echo -e "  🌐 Website URL:    ${CYAN}http://${SERVER_IP}${NC}"
fi
echo -e "  🔑 Admin Password:  ${PURPLE}${USER_ADMIN_PWD}${NC}"
echo -e "  📁 Data Location:   ${APP_DIR}/data"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  - Check Status:    ${CYAN}pm2 status${NC}"
echo -e "  - View Live Logs:  ${CYAN}pm2 logs animegabar${NC}"
echo -e "  - Restart Server:  ${CYAN}pm2 restart animegabar${NC}"
echo -e "  - Update to Latest:${CYAN}bash update.sh${NC}"
echo ""
