# SnapSync Technical Architecture & System Design

This document details the architectural design, dev stack, data flows, database schemas, and communication protocols across all SnapSync services.

---

## 1. High-Level Architecture Overview

SnapSync is organized as a distributed, decoupled photo booth system composed of four primary subsystems:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SnapSync Desktop Client                         │
│  - Electron 28 (Main & Preload & Renderer processes)                   │
│  - WebRTC Camera Engine + gphoto2 CLI / DigiCamControl tethering       │
│  - Local SQLite Offline Buffer (queue.db)                              │
│  - Web Audio Synthesizer                                               │
└──────────────────┬─────────────────────────────▲───────────────────────┘
                   │ Photo Uploads (HTTP Multipart)
                   │ Real-time Telemetry (Socket.IO)
                   │
                   │ Remote Control / Config Push
                   ▼                             │
┌────────────────────────────────────────────────┴───────────────────────┐
│                        SnapSync Server (Hub)                           │
│  - Node.js 20 + Express 4 + TypeScript                                 │
│  - Socket.IO 4 (Bidirectional Booth & Operator Control)                │
│  - Sharp (libvips) Image Processing Pipeline                           │
│  - Nodemailer (SMTP Service)                                           │
│  - Archiver (Streaming ZIP downloads)                                  │
│  - Vue 3 Operator Dashboard (Vite 5 + Pinia + Vue Router 4)           │
│  - Port 3000 (API & WS) / Port 5173 (Dev HMR)                          │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │        Shared Persistence         │
                │  - SQLite 3 (WAL mode)            │
                │  - /storage/photos                │
                │  - /storage/frames                │
                │  - /storage/logs                  │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SnapSync Share (Public)                         │
│  - Node.js 20 + Express 4 + TypeScript                                 │
│  - Lightweight Vanilla/TS frontend bundled with esbuild                │
│  - HMAC-SHA256 Signed URL validation                                   │
│  - Bandwidth budget enforcement & Rate limiting                        │
│  - UA-Parser-JS guest analytics                                        │
│  - Port 3001                                                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dev Stack & Technologies

### 2.1 SnapSync Client (`snapsync-client`)
- **Runtime:** Electron 28.3.3, Node.js 20.
- **Languages & Compilers:** TypeScript 5.3, esbuild 0.20 (compiling renderer to single IIFE bundle), Electron Forge 7.2.
- **Embedded Database:** `better-sqlite3` compiling native C++ bindings for desktop-local queue (`queue.db`).
- **UI & Styling:** Responsive touchscreen interface styled with Pico CSS 2 and custom CSS design tokens (`tokens.css`, `components.css`).
- **Camera Engines:**
  - Standard: HTML5 `navigator.mediaDevices.getUserMedia` WebRTC stream.
  - DSLR macOS/Linux: `child_process.spawn` interfacing with `gphoto2` CLI with PATH resolution fallback.
  - DSLR Windows: Bundled `CameraControl.exe /minimized` with HTTP client talking to `http://localhost:5513`.
- **Audio Engine:** Web Audio API synthesizer for ticks, shutter click, and celebration fanfare without external audio asset dependencies.

### 2.2 SnapSync Server (`snapsync-server`)
- **Runtime:** Node.js 20 LTS.
- **HTTP & Middleware:** Express 4.22, Helmet (CSP, HSTS), Compression (gzip/brotli), Cookie-Parser, CORS.
- **Real-Time Communication:** Socket.IO 4.8 with binary transport support, rooms per event, and heartbeat keepalive.
- **Image Pipeline:** Sharp 0.35 (libvips) handling WebP transcoding, high-res JPEG framing, thumbnail scaling, SVG mask compositing, and dynamic typography.
- **Database Access:** `better-sqlite3` with Write-Ahead Logging (`WAL`) mode enabled.
- **Security:** JWT (`jsonwebtoken`), bcryptjs for password hashing, CSRF double-submit cookies, Zod schema validation.
- **Operator Frontend:** Vue 3.5 (Composition API `<script setup>`), Vite 5.4, Pinia 2.1, Vue Router 4.2, Vue3-Toastify, vuedraggable.

### 2.3 SnapSync Share (`snapsync-share`)
- **Runtime:** Node.js 20 LTS.
- **HTTP Server:** Express 4.22, compression, helmet.
- **Guest Frontend:** TypeScript bundled into a single minified `app.js` using esbuild, zero external framework dependencies for maximum mobile loading speed.
- **Security:** HMAC-SHA256 signature verification with secret token, expiration checks, and link obfuscation.
- **Analytics:** Device, OS, and browser classification via `ua-parser-js`.

### 2.4 Shared Module (`@snapsync/shared`)
- Local file package shared between server and share services.
- Manages single-source-of-truth database migrations, queries, and cryptographic helpers.
- Logger using Winston 3 with `winston-daily-rotate-file`.

---

## 3. Database Schema (SQLite)

SnapSync uses SQLite located at `storage/db/snapsync.db` with `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`.

### Core Tables

#### `events`
Primary entity representing a photo booth activation.
- `id` (TEXT PRIMARY KEY): Format `evt_<timestamp>_<random>`.
- `name` (TEXT NOT NULL): Event title.
- `date` (TEXT NOT NULL): Event date (`YYYY-MM-DD`).
- `description` (TEXT): Optional notes.
- `otp` (TEXT UNIQUE NOT NULL): 6-digit numeric pairing code used by the booth client.
- `status` (TEXT NOT NULL): `active` | `ended` | `upcoming` | `completed` | `inactive`.
- `photo_count` (INTEGER NOT NULL DEFAULT 4): Shots per session.
- `countdown` (INTEGER NOT NULL DEFAULT 5): Seconds before each shot.
- `capture_interval` (INTEGER NOT NULL DEFAULT 1): Delay between shots.
- `post_capture_preview` (INTEGER NOT NULL DEFAULT 2): Duration to flash review photo on booth.
- `dslr_iso`, `dslr_shutterspeed`, `dslr_aperture`, `dslr_focus_mode`: Camera exposure overrides.
- `dslr_whitebalance`, `dslr_whitebalance_kelvin`: White balance configuration.
- `obfuscate_links` (INTEGER DEFAULT 0): Whether guest photo filenames are masked.
- `expiry_type` (TEXT DEFAULT 'none'): `none` | `absolute` | `relative`.
- `expiry_value` (TEXT): Date string or relative duration (e.g., `7_days`).
- `organizer`, `contact_info`: Displayed in the guest share footer.
- `share_originals` (INTEGER DEFAULT 1): Whether raw un-framed individual photos can be downloaded.
- `operator_password` (TEXT): Optional passcode for event-scoped operators.
- `msg_homepage`, `msg_countdown`, `msg_post_session`, `msg_share_title`: Motivational messaging strings (JSON arrays).
- `msg_order` (TEXT DEFAULT 'random'): `random` | `sequential`.
- `email_subject`, `email_body`, `email_from_name`, `email_enabled`: Email template configuration.

#### `photo_sessions`
Represents a completed photo booth session.
- `id` (TEXT PRIMARY KEY): Session identifier, e.g., `session_<timestamp>`.
- `event_id` (TEXT REFERENCES events(id) ON DELETE CASCADE).
- `share_id` (TEXT UNIQUE): Primary public share identifier.
- `created_at` (TEXT): Creation timestamp.
- `archived` (INTEGER DEFAULT 0): Soft deletion flag.
- `upload_status` (TEXT DEFAULT 'reserved'): `reserved` | `uploading` | `complete` | `failed`.
- `upload_started_at`, `upload_completed_at`, `upload_size_bytes`, `upload_avg_speed_kbps`: Upload telemetry.
- `width`, `height`: Session pixel dimensions.
- `share_title` (TEXT): Custom guest title for this specific session.

#### `session_shares`
Supports multi-share token generation and independent revocation per session.
- `id` (TEXT PRIMARY KEY): Hex share token.
- `session_id` (TEXT REFERENCES photo_sessions(id) ON DELETE CASCADE).
- `is_active` (INTEGER DEFAULT 1): Instant enable/disable switch.
- `created_at` (TEXT): Creation timestamp.

#### `event_shares`
Master gallery share token linking to all active sessions in an event.
- `token` (TEXT PRIMARY KEY): UUIDv4 token.
- `event_id` (TEXT REFERENCES events(id) ON DELETE CASCADE).
- `created_at` (TEXT).

#### `users`
Administrative and operator accounts.
- `id` (TEXT PRIMARY KEY).
- `email` (TEXT UNIQUE NOT NULL).
- `password_hash` (TEXT NOT NULL): bcrypt hash.
- `role` (TEXT NOT NULL): `admin` | `operator`.
- `name` (TEXT).
- `is_disabled` (INTEGER DEFAULT 0).
- `is_superadmin` (INTEGER DEFAULT 0).

#### `event_operators`
Event-scoped guest operators with restricted access to a single event.
- `id` (TEXT PRIMARY KEY).
- `event_id` (TEXT REFERENCES events(id) ON DELETE CASCADE).
- `name` (TEXT NOT NULL).
- `password_hash` (TEXT NOT NULL).
- `access_token` (TEXT UNIQUE NOT NULL).

#### `share_analytics`
Privacy-preserving access metrics for guest shares.
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT).
- `share_id` (TEXT NOT NULL).
- `ip_address` (TEXT).
- `device_type` (TEXT): `Mobile` | `Tablet` | `Desktop`.
- `os` (TEXT): e.g., `iOS`, `Android`, `macOS`, `Windows`.
- `browser` (TEXT): e.g., `Mobile Safari`, `Chrome`.
- `action` (TEXT NOT NULL): `view` | `download` | `share`.
- `target_file` (TEXT).
- `source` (TEXT): e.g., `qr` | `direct`.
- `created_at` (TEXT).

#### `email_sends`
Log of gallery emails sent via SMTP.
- `id` (TEXT PRIMARY KEY).
- `session_id` (TEXT REFERENCES photo_sessions(id) ON DELETE CASCADE).
- `event_id` (TEXT NOT NULL).
- `share_id` (TEXT REFERENCES session_shares(id) ON DELETE CASCADE).
- `recipient_email` (TEXT NOT NULL).
- `status` (TEXT DEFAULT 'pending'): `pending` | `sent` | `failed`.
- `error_code`, `error_message`: SMTP failure diagnostics.
- `sent_at`, `created_at`, `sent_by_name`.

#### `global_settings` & `camera_settings`
Singleton tables holding global defaults for capture timings, camera profiles, rate limits, and SMTP defaults.

---

## 4. Real-Time Communication Protocols (Socket.IO)

Communication between the Capture Client and the Operator Hub uses Socket.IO.

### Authentication & Handshake
During connection, the client sends credentials in the handshake `auth` payload:
- **Operator:** `{ token: "<JWT_ACCESS_TOKEN>" }` -> Verified using `JWT_SECRET`. Joins operator pool.
- **Booth Client:** `{ otp: "123456" }` -> Verified against active event in SQLite. Assigned role `booth` and joined to event room.

### Socket Events Reference

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `subscribe` | Operator -> Server | `eventId: string` | Operator registers interest in an event room. |
| `unsubscribe` | Operator -> Server | `eventId: string` | Operator leaves event room. |
| `booth-connected` | Server -> Operator | `{ eventId, connected }` | Notifies operator whether booth client is online. |
| `booth-state` | Booth <-> Server <-> Operator | `BoothStateFull` | Synchronizes current state: `idle`, `countdown`, `capturing`, `preview`, `paused`. |
| `booth-capture` | Operator -> Server -> Booth | `{ eventId, sessionId? }` | Remote shutter trigger from operator dashboard. |
| `booth-pause` | Operator -> Server -> Booth | `{ eventId, paused }` | Toggles booth pause state (locks/unlocks kiosk UI). |
| `trigger-reshot` | Operator -> Server -> Booth | `{ eventId }` | Discards current bad shot and re-captures. |
| `frame-override` | Operator -> Server -> Booth | `{ eventId, frameId }` | Forces booth to use a specific frame template. |
| `request-booth-config` | Operator -> Server -> Booth | `eventId: string` | Fetches active local client settings. |
| `update-booth-config` | Operator -> Server -> Booth | `{ eventId, config }` | Pushes timing or camera config overrides to booth. |
| `upload-progress` | Booth -> Server -> Operator | `{ percent, speed, eta, elapsed }` | Real-time session upload progress bar. |
| `queue-update` | Booth -> Server -> Operator | `{ uploading, queued, uploadedSessions }` | Offline queue telemetry. |
| `start-preview-stream` | Operator -> Server -> Booth | `{ eventId }` | Requests live camera preview video stream. |
| `stop-preview-stream` | Operator -> Server -> Booth | `{ eventId }` | Stops camera preview streaming. |
| `preview-frame` | Booth -> Server -> Operator | Binary JPEG Buffer | High-frequency live viewfinder preview frames. |

---

## 5. Image Processing Pipeline (Sharp)

The server image engine (`pipeline.ts`) runs jobs via an asynchronous queue with bounded concurrency (`maxConcurrent: 3`):

```
Raw Camera JPEG
     │
     ├──► processSinglePhoto ──► Auto-rotate ──► WebP Transcode (Quality 75) ──► Single Photo WebP
     │
     ├──► generateThumbnail ──► Resize (1920px max) ──► WebP Transcode (Quality 80) ──► Thumbnail WebP
     │
     └──► applyFrame 
            ├── Frame Template Background / Foreground Layer
            ├── Placeholders (x, y, w, h, borderRadius with SVG dest-in mask)
            ├── Dynamic Text SVG Compositing ({{date}}, {{time}}, {{filename}})
            │
            ├──► WebP Output (Quality 75) ──► For fast web/mobile viewing
            ├──► JPEG Output (Quality 95) ──► For high-res printing and downloading
            └──► WebP Thumbnail ──► For responsive gallery cards
```

---

## 6. Offline Queue & Network Resilience

The desktop client implements an offline-first architecture using a dedicated SQLite database (`queue.db`):

1. **Session Completion:** Once the final photo of a session is taken, images and metadata are committed to `pending_uploads` in `queue.db`.
2. **Background Sync:** A worker checks for pending items every 5 seconds.
3. **Chunked & Resilient Uploads:** Files are transmitted via multipart HTTP POST to `/api/booth/upload`.
4. **Retry with Exponential Backoff:** On network drop or server error, `retry_count` increments, and `next_retry_at` is scheduled with jitter.
5. **Network Simulation:** Built-in dev settings allow injecting latency (ms), packet loss (%), timeout (%), and simulated offline modes to verify booth stability under harsh event WiFi conditions.

