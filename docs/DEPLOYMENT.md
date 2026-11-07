# SnapSync Production Deployment Guide

This guide covers deploying SnapSync in production environments using Docker Compose, configuring Nginx as a reverse proxy, provisioning SSL certificates, setting up environment variables, and compiling desktop clients.

---

## 1. System Requirements

### Server (Host)
- **Operating System:** Ubuntu 20.04/22.04 LTS, Debian 11/12, or any Linux distribution supporting Docker.
- **CPU & RAM:** Minimum 2 vCPU, 2 GB RAM (4 GB recommended for concurrent Sharp image processing).
- **Disk Space:** 20 GB+ SSD recommended (scales with photo storage).
- **Installed Software:** Docker Engine 24+ and Docker Compose v2.

### Booth Client Hardware
- **macOS:** macOS 11 (Big Sur) or newer (Apple Silicon & Intel supported).
- **Windows:** Windows 10 / 11 64-bit.
- **Hardware:** Touchscreen monitor/tablet or desktop PC connected to a webcam or tethered DSLR.

---

## 2. Directory Layout & Volumes

Both `snapsync-server` and `snapsync-share` require persistent shared storage. The root project structure uses:

```
snapsync/
├── docker-compose.yml       # Production services
├── .env                     # Secrets and configuration
├── storage/
│   ├── photos/              # Uploaded raw and framed photos
│   ├── frames/              # Frame template PNG assets and frame configs
│   ├── logs/                # Daily rotated application log files
│   └── db/                  # SQLite database (snapsync.db and WAL files)
```

---

## 3. Environment Configuration (`.env`)

Generate secure random secrets before launching in production:

```bash
# Generate 32-byte hexadecimal secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create `.env` in the repository root:

```ini
# ==========================================
# SHARED ENVIRONMENT
# ==========================================
NODE_ENV=production
PORT=3000

# Security Secrets (Must be unique and kept secret)
INTERNAL_API_SECRET=e7b4...f902
SIGNED_URL_SECRET=4a2c...b189
JWT_SECRET=88df...6531
REFRESH_TOKEN_SECRET=3c91...aa42
JWT_ACCESS_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# ==========================================
# OPERATOR DASHBOARD (snapsync-server)
# ==========================================
OPERATOR_EMAIL=operator@yourdomain.com
OPERATOR_PASSWORD=SuperStrongPasswordHere!

VITE_BASE_URL=/
COOKIE_DOMAIN=.yourdomain.com
COOKIE_PATH=/
COOKIE_SAME_SITE=lax
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://operator.yourdomain.com,https://share.yourdomain.com

# ==========================================
# SHARE PAGE (snapsync-share)
# ==========================================
SHARE_BASE_URL=https://share.yourdomain.com
VITE_SHARE_BASE_URL=https://share.yourdomain.com/share
ADMIN_INTERNAL_URL=http://snapsync-server:3000

# ==========================================
# EMAIL / SMTP SETTINGS (Optional)
# ==========================================
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM_ADDRESS=booth@yourdomain.com
SMTP_FROM_NAME="SnapSync Photo Booth"
```

---

## 4. Docker Compose Deployment

SnapSync runs two containers defined in `docker-compose.yml`:
1. **`snapsync-server`** (port `3000`): Operator API, WebSocket hub, image pipeline.
2. **`snapsync-share`** (port `3001`): Public guest gallery, HMAC signed photo delivery.

```bash
# Start all services in the background
docker compose up -d

# Verify containers are running and healthy
docker compose ps

# Inspect logs
docker compose logs -f snapsync-server
docker compose logs -f snapsync-share
```

---

## 5. Nginx Reverse Proxy Configuration

Nginx acts as the TLS-terminating reverse proxy, forwards WebSockets, handles rate limiting, and serves immutable static assets with long cache headers.

### Deployment Topology: Dedicated Subdomains

- `operator.yourdomain.com` -> proxies to `127.0.0.1:3000`
- `share.yourdomain.com` -> proxies to `127.0.0.1:3001`

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=admin_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=share_limit:10m rate=200r/m;

# ==========================================
# 1. Operator Dashboard (operator.yourdomain.com)
# ==========================================
server {
    listen 80;
    server_name operator.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name operator.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Operator API
    location /api/ {
        limit_req zone=admin_limit burst=25 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Login endpoint brute-force restriction
    location /api/auth/login {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for real-time booth & operator sync
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Operator Dashboard Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|webp|avif|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# ==========================================
# 2. Public Share Server (share.yourdomain.com)
# ==========================================
server {
    listen 80;
    server_name share.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name share.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Share API & Downloads
    location /snapsync/api/ {
        limit_req zone=share_limit burst=50 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off; # Enable streaming downloads for large ZIPs
    }

    # Public Share Gallery UI
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. SSL / TLS Certificate Automation

Install Certbot to manage Let's Encrypt certificates:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates for both subdomains
sudo certbot --nginx -d operator.yourdomain.com -d share.yourdomain.com
```

---

## 7. Client Compilation & Packaging

### macOS `.app` and `.dmg`
```bash
cd snapsync-client
npm install
npm run make
```
Installers will be located in `snapsync-client/out/make/`.

### Windows `.exe` Setup
1. On a Windows workstation, install Node.js 20+, Python 3, and Visual Studio Build Tools (C++ workload).
2. Install DigiCamControl, then copy its program files to `snapsync-client/digiCamControl`.
3. In PowerShell:
   ```powershell
   cd snapsync-client
   npm install
   npm run make
   ```
   Electron Forge outputs `snapsync-booth Setup.exe` in `out/make/`. End users simply double-click the installer; all dependencies are self-contained.

---

## 8. Backup and Restore Procedures

### Database & Storage Backup
All data is stored inside `./storage`. Back up the entire folder:

```bash
# Safely snapshot the SQLite database during runtime:
sqlite3 storage/db/snapsync.db ".backup 'storage/db/snapsync_backup_$(date +%F).db'"

# Archive photos and frames:
tar -czvf snapsync_backup_$(date +%F).tar.gz storage/
```

### Event-Level Portability
Operators can download an entire event directly from the dashboard (`/events/:id` -> **Export Event**). This generates a `.zip` file containing all JSON metadata, sessions, shares, and high-res media. The package can be imported into another SnapSync instance at any time with transactional integrity.
