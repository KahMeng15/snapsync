# SnapSync

> **Modern, self-hosted photo booth system for events, corporate activations, and weddings.**  
> Offline-first Electron capture client &bull; Dual-node Express/Sharp backend &bull; Vue 3 Operator Dashboard &bull; High-performance public guest gallery with HMAC-signed URLs.

```
┌────────────────────────────────┐         WebSocket / HTTP          ┌───────────────────────────────────┐
│       SnapSync Client          │◄─────────────────────────────────►│         SnapSync Server           │
│  (Electron + WebRTC / gphoto2) │  Telemetry, Remote Controls, Sync │ (Express + Socket.IO + Sharp Hub) │
└────────────────────────────────┘                                   │        [:3000 / :5173 HMR]        │
                                                                     └─────────────────┬─────────────────┘
                                                                                       │ Shared SQLite DB & Storage
                                                                                       │ (Photos, Frames, Logs)
                                                                                       ▼
┌────────────────────────────────┐         HTTP (Signed URLs)        ┌───────────────────────────────────┐
│          Guest Mobile          │◄──────────────────────────────────│          SnapSync Share           │
│    (Responsive Web Gallery)    │   Fast WebP/JPEG Streaming, ZIPs  │  (Dedicated Public Gallery Node)  │
└────────────────────────────────┘                                   │              [:3001]              │
                                                                     └───────────────────────────────────┘
```

---

## Highlights & Capabilities

- **Offline-First Capture Engine:** Client operates seamlessly without internet. Captures are saved locally to an embedded SQLite queue and automatically synced to the server in the background with exponential backoff and speed telemetry.
- **Dual Camera Architecture:**
  - **Zero-Config WebRTC Webcam:** Works out-of-the-box with any built-in or USB webcam.
  - **Tethered DSLR / Mirrorless:** Professional USB capture via `gphoto2` (macOS/Linux) or bundled `DigiCamControl` (Windows). Hardware shutter firing, ~15 FPS live preview streaming, and complete remote exposure control (ISO, shutter speed, aperture, white balance kelvin, focus mode).
- **Two-Way Real-Time Operator Hub:** Built on Socket.IO. Operators can remotely trigger shots, pause the booth, override frames, monitor live camera feeds with viewer limits, and view upload queue status in real time.
- **Dynamic Frame & Overlay Designer:** Visual drag-and-drop frame editor with arbitrary placeholder positioning, rounded corner masks (`rx`/`ry`), foreground/background layering, and dynamic text overlays (`{{date}}`, `{{time}}`, `{{filename}}`) with typography and anchor controls.
- **Secure Guest Sharing:** 
  - Dedicated lightweight Share Server (`snapsync-share`).
  - Multi-share tokens per session (instant revocation/activation).
  - Cryptographic HMAC-SHA256 signed time-limited photo URLs to prevent scraping and IDOR attacks.
  - Optional filename and path obfuscation.
  - Configurable expiration (absolute date or relative duration).
- **Multi-Role Administration & Audit Logging:** Super Admin, Admin, and Event Operator roles with scoped permissions. Every administrative action is logged to SQLite with IP and timestamp.
- **Email Sharing with SMTP:** Direct email sharing of guest galleries with customizable per-event and global email templates, delivery status tracking, and audit history.
- **Real-Time Analytics:** Track event engagement, total views, unique visitors (IP-based), device types, operating systems, browsers, and download actions.
- **Full Event Backup & Portability:** One-click full event backup to ZIP (metadata, sessions, shares, email logs, frames) with transactional import and conflict resolution.

---

## Architecture & Dev Stack

| Component | Directory | Technology Stack | Description |
|---|---|---|---|
| **Capture Client** | [`snapsync-client/`](snapsync-client/) | Electron 28, TypeScript, esbuild, better-sqlite3, Web Audio API, gphoto2, DigiCamControl | Desktop capture application with touchscreen kiosk support, offline queue, audio cues, and hardware tethering. |
| **Operator Server** | [`snapsync-server/`](snapsync-server/) | Node.js 20, Express 4, TypeScript, Socket.IO 4, Sharp (libvips), better-sqlite3, Nodemailer, Archiver | Central processing hub, image pipeline, WebSocket broker, authentication, and REST API. |
| **Operator UI** | [`snapsync-server/frontend/`](snapsync-server/frontend/) | Vue 3 (Composition API), Vite 5, Pinia, Vue Router 4, Socket.IO Client, QR Code Vue | Real-time administrative dashboard for event operators and booth managers. |
| **Share Server** | [`snapsync-share/`](snapsync-share/) | Node.js 20, Express 4, TypeScript, esbuild, Sharp, UAParser, Archiver | High-throughput, isolated public-facing server delivering guest galleries, signed URLs, and streaming ZIP downloads. |
| **Shared Core** | [`shared/`](shared/) | TypeScript, better-sqlite3, Winston, Winston-Daily-Rotate-File | Shared database schemas, migrations, cryptographic helpers, Winston logger, and rate limiters. |

---

## Quick Start (Production via Docker Compose)

The fastest and most reliable way to deploy SnapSync is with Docker Compose. This starts both `snapsync-server` and `snapsync-share` with persistent volume mounts for photos, frames, logs, and the SQLite database.

### 1. Clone and Configure

```bash
git clone https://github.com/kahmeng15/snapsync.git
cd snapsync

# Copy the environment template
cp .env.example .env
```

Edit `.env` to configure your secrets:
```bash
# Generate secure 32-byte hex keys:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INTERNAL_API_SECRET=your_super_secret_internal_key
SIGNED_URL_SECRET=your_super_secret_signed_url_key
JWT_SECRET=your_super_secret_jwt_key
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key

# Operator Credentials
OPERATOR_EMAIL=operator@snapsync.local
OPERATOR_PASSWORD=your_secure_password
```

### 2. Launch Containers

```bash
docker compose up -d
```

### 3. Access Portals

- **Operator Dashboard:** `http://localhost:3000` (Default: `operator@snapsync.local` / `admin123` or your `.env` value)
- **Public Share Gallery:** `http://localhost:3001`
- **Health Check:** `http://localhost:3000/api/health`

---

## Development Setup

### Option A: Docker Dev Environment (Recommended)

Run the full stack with hot module replacement (HMR) and live reload without installing Node.js locally:

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | Port | Description |
|---|---|---|
| **Operator Dashboard (HMR)** | `http://localhost:5173` | Vite dev server for the Vue 3 operator UI |
| **Operator API + WebSocket** | `http://localhost:3000` | Express server running with `tsx watch` |
| **Share Server + Frontend** | `http://localhost:3001` | Public share service with live esbuild watch |

To stop:
```bash
docker compose -f docker-compose.dev.yml down
```

### Option B: Local Setup (Native Node.js)

**Prerequisites:** Node.js 20+, npm 10+

1. **Build the Shared Library:**
   ```bash
   cd shared
   npm install
   npm run build
   cd ..
   ```

2. **Run the Operator Server & Frontend:**
   ```bash
   cd snapsync-server
   npm install

   # Terminal 1: Backend API + WebSocket
   npm run dev

   # Terminal 2: Vue 3 Operator Dashboard
   npm run dev:frontend
   ```

3. **Run the Public Share Server:**
   ```bash
   cd snapsync-share
   npm install

   # Terminal 1: Share API
   npm run dev

   # Terminal 2: Share Client Bundle
   npm run dev:frontend
   ```

---

## Capture Client Setup & Compilation

The capture client runs on macOS and Windows as a standalone Electron desktop application.

### macOS Build Instructions

1. **Install Dependencies:**
   ```bash
   cd snapsync-client
   npm install
   ```

2. **Run in Development:**
   ```bash
   npm run dev
   ```

3. **Build Distributables (`.app`, `.dmg`, `.zip`):**
   ```bash
   npm run make
   ```
   *Output packages are generated in `snapsync-client/out/make/`.*

### Windows Build Instructions

1. **Prerequisites:**
   - [Node.js 20+](https://nodejs.org/)
   - [Python 3](https://www.python.org/)
   - [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (with the *Desktop development with C++* workload selected for compiling `better-sqlite3`).

2. **Bundle DigiCamControl:**
   - Install [DigiCamControl](http://digicamcontrol.com/) on your build machine.
   - Copy `C:\Program Files (x86)\digiCamControl` into `snapsync-client/digiCamControl`.

3. **Install & Compile:**
   ```powershell
   cd snapsync-client
   npm install
   npm run make
   ```
   *Electron Forge bundles `digiCamControl` and outputs a standalone `snapsync-booth Setup.exe` in `out/make/`.*

---

## Camera Support

SnapSync features native dual-camera support configurable directly from the client Settings modal (`Cmd/Ctrl+Shift+S`):

| Camera Mode | Backend | Live Preview | Capture Pipeline | Supported Hardware |
|---|---|---|---|---|
| **Webcam** | HTML5 `getUserMedia` | WebRTC 30-60 FPS | In-memory frame extraction to Canvas | Any UVC-compliant webcam or capture card |
| **DSLR / Mirrorless (macOS/Linux)** | `gphoto2` CLI | ~15 FPS MJPEG preview | Hardware shutter fire (`--capture-image-and-download --keep`) | Canon, Nikon, Sony (PC Remote), Fuji, etc. |
| **DSLR / Mirrorless (Windows)** | Bundled `DigiCamControl` | ~15 FPS HTTP liveview | Shutter command via local HTTP API (`:5513`) | Canon, Nikon, Sony, etc. |

### macOS DSLR Quick Setup

```bash
# 1. Install gphoto2 via Homebrew
brew install gphoto2

# 2. Release macOS PTP daemons that lock USB camera access
killall PTPCamera 2>/dev/null
# Or run the included helper tool:
./fix-camera-daemons.sh
```

→ Consult [`docs/CAMERAS.md`](docs/CAMERAS.md) for detailed camera configurations, tethering checklists, and model-specific tuning.

---

## Keyboard Shortcuts

### Booth Capture Client

| Shortcut | Action |
|---|---|
| `Space` | Start countdown / trigger capture session |
| `Cmd/Ctrl + Shift + S` | Open Booth Settings modal (Camera, Timing, Display, Dev Sim) |
| `Cmd/Ctrl + Shift + G` | Open Local Gallery and Offline Queue status |
| `Cmd/Ctrl + F` | Toggle Fullscreen mode |
| `Escape` | Dismiss modal / exit fullscreen / return to idle screen |

### Operator Dashboard

| View | Purpose |
|---|---|
| `/events` | Event list, status management (Active, Ended, Upcoming, Completed), OTP pairing codes |
| `/events/:id` | Event detail, live session browser, photo downloads, batch reframing, sharing links |
| `/events/:id/remote` | Live camera preview stream, remote shutter trigger, booth pause/unpause, reshot |
| `/events/:id/frames` | Frame manager, upload PNG frames, visual canvas editor for placeholders and text |
| `/events/:id/analytics` | Real-time visitor logs, unique IPs, device types, browsers, action histories |
| `/events/:id/settings/booth` | Per-event photo count, countdown, capture interval, DSLR exposure overrides |
| `/users` | User management (Super Admin, Admin, Operator roles) |
| `/settings` | Global default booth timings, camera exposure presets, rate limits, SMTP email defaults |

---

## Documentation Index

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Technical deep dive, component flows, database schemas, IPC and WebSocket protocols.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Production Docker Compose, Nginx reverse proxy configs, SSL certificates, multi-domain setups.
- [`docs/SECURITY.md`](docs/SECURITY.md) — Authentication flow, HMAC URL signing, CSRF protection, RBAC, brute-force mitigation, and security headers.
- [`docs/BANDWIDTH.md`](docs/BANDWIDTH.md) — Image optimization (WebP/JPEG), streaming downloads, caching policy, and queue telemetry.
- [`docs/CAMERAS.md`](docs/CAMERAS.md) — Comprehensive DSLR/mirrorless camera setup, gphoto2 tuning, DigiCamControl integration, and troubleshooting.

---

## License

Proprietary / Private. All rights reserved.
