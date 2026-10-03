# snapsync

Self-hosted photo booth system. Two-node: Electron capture client + Express/Vue 3 operator hub.

```
Booth Client (Electron) ──HTTP/WS──→ Server (Express + Vue 3 + Sharp + Socket.IO)
```

## Server Deployment (Docker Compose)

The easiest way to deploy the snapsync server for production is using Docker Compose.

1. **Configure Environment:**
   From the repository root, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to set your desired `JWT_SECRET`, and `SMTP_` settings (if you want to enable email sharing).

2. **Run Docker Compose:**
   Run the production docker compose file from the repository root:
   ```bash
   docker compose up -d
   ```
   *(This will automatically pull the pre-built `snapsync-server` and `snapsync-share` images from GHCR and start them).*

3. **Access the Dashboard:**
   The Operator Dashboard will be available at `http://localhost:3000`.
   Default credentials: `operator@snapsync.local` / `admin123`

   The Public Share site will be available at `http://localhost:3001`.

## Compiling and Running the Client App

The Photobooth capture client runs as an Electron application on macOS and Windows.

### macOS Build Instructions

1. **Prerequisites:** 
   Install [Node.js](https://nodejs.org/) on your Mac.

2. **Install Dependencies:**
   Navigate to the client directory and install the required packages:
   ```bash
   cd snapsync-client
   npm install
   ```

3. **Run in Development Mode:**
   To run the app quickly for testing without packaging it:
   ```bash
   npm run dev
   ```

4. **Package and Make Installer:**
   To create a standalone `.app` bundle and a shareable installer (`.dmg` or `.zip`):
   ```bash
   npm run make
   ```
   *The resulting installer files will be placed in: `snapsync-client/out/make/`*

### Windows Build Instructions

Building the client on Windows requires compiling native C++ database drivers (`better-sqlite3`) and bundling the Windows camera backend (`digiCamControl`).

1. **Developer Prerequisites:**
   - Install [Node.js](https://nodejs.org/).
   - Install Python 3.
   - Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select the **Desktop development with C++** workload.

2. **Bundle DigiCamControl:**
   - Install [DigiCamControl](http://digicamcontrol.com/) on your PC.
   - Copy the installation folder (usually `C:\Program Files (x86)\digiCamControl`) into the `snapsync-client` project folder and rename it to `digiCamControl`. 
   *(The build script expects `snapsync-client/digiCamControl` to exist so it can bundle it).*

3. **Install Dependencies:**
   Navigate to the client directory in PowerShell or Command Prompt:
   ```bash
   cd snapsync-client
   npm install
   ```

4. **Run in Development Mode:**
   ```bash
   npm run dev
   ```

5. **Make Windows Installer (.exe):**
   ```bash
   npm run make
   ```
   *Electron Forge will compile everything into a standalone `snapsync-booth Setup.exe` file in the `snapsync-client/out/make/` folder. Your end users just double-click this `.exe`—they do not need to install Node, Python, or DigiCamControl!*

---

## Development Environment

### Docker (recommended)

Use `docker-compose.dev.yml` to run the server without installing Node locally. It mounts your source files for live-reload and runs both the Express API and the Vue 3 frontend concurrently inside the container.

```bash
# From the repo root
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Express API + WebSocket | `http://localhost:3000` |
| Vue 3 operator dashboard (HMR) | `http://localhost:5173` |

> **Note** — source files in `./snapsync-server` are bind-mounted into the container, so any edits are reflected immediately without rebuilding. `node_modules` lives in an anonymous volume to prevent host/container OS conflicts.

To stop:

```bash
docker compose -f docker-compose.dev.yml down
```

### Server Local Setup (Without Docker)

```bash
cd snapsync-server

# Terminal 1 — Express API + WebSocket (hot-reload, logs all requests)
npm run dev

# Terminal 2 — Vue 3 frontend with HMR (auto-opens at http://localhost:5173)
npm run dev:frontend
```

API calls from the frontend are proxied to the Express server automatically. Open `http://localhost:5173` for the operator dashboard.

## Camera Support

snapsync supports two capture modes, switchable from the Settings panel (`Cmd/Ctrl+Shift+S` inside the client app):

| Mode | Description |
|---|---|
| **Webcam** (default) | Uses any `getUserMedia`-compatible webcam. Zero setup. |
| **DSLR / Mirrorless** | USB tethered camera. Live preview + hardware shutter fire. |

### DSLR / Mirrorless — Quick Setup

**macOS** — install gphoto2:
```bash
brew install gphoto2
# Kill the macOS PTP daemon before each session:
killall PTPCamera 2>/dev/null
```

**Windows** — install [DigiCamControl](http://digicamcontrol.com/) and ensure it is
running in the system tray before launching the booth.

Tested cameras: **Canon EOS 80D**, **Sony A7RII**. Any gphoto2 / DigiCamControl
compatible camera should work.

→ See [`docs/CAMERAS.md`](docs/CAMERAS.md) for the full guide, camera settings,
and troubleshooting.

## Auth

Default Operator Login: `operator@snapsync.local` / `admin123`

## Docs

- `docs/CAMERAS.md` — DSLR/mirrorless camera setup (macOS & Windows)
- `docs/DEPLOYMENT.md` — Local + public hosting
- `docs/SECURITY.md` — OAuth2, JWT, CSRF, headers
- `docs/BANDWIDTH.md` — Image compression, caching, targets
- `nginx.conf` — Nginx reverse proxy config for kmeng.com
