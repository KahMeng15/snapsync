# Deployment Guide

## Local Network (Default)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for development)

### Server Setup
```bash
cd snapsync-server
cp .env.example .env
# Edit .env to set strong passwords and secrets

# Build & start
docker compose up -d --build

# Access operator dashboard at http://localhost:3000
```

### Client Setup
```bash
cd snapsync-client
npm install
npm run make
# Installers in ./out/
```

## Public Hosting (kmeng.com/app/snapsync/)

### DNS Setup
- Create CNAME: `snapsync` → your server IP

### Nginx + SSL
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot certonly -d snapsync.kmeng.com
sudo cp ../nginx.conf /etc/nginx/sites-available/snapsync
sudo ln -s /etc/nginx/sites-available/snapsync /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Firewall
- Allow 443 (HTTPS) and 80 (HTTP redirect)
- Restrict 3000 to LAN only
