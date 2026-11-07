# Bandwidth Management & Image Pipeline Optimization

Event venues frequently suffer from congested Wi-Fi, high packet loss, or reliance on cellular LTE/5G hotspots. SnapSync is architected to operate efficiently under constrained network conditions while preserving full-resolution photographic quality for guests and prints.

---

## 1. Network Performance Targets

| Metric | Target | Realized Performance | Notes |
|---|---|---|---|
| **Booth Upload Bandwidth** | < 5 Mbps sustained | ~1.5 - 3.5 Mbps per active booth | Photos buffered locally and uploaded asynchronously in the background. |
| **Guest Gallery Page Load** | < 1.5 seconds on 4G | < 800 ms (First Contentful Paint) | WebP thumbnails with progressive image hydration. |
| **Full Session Processing** | < 3 seconds | ~1.8 seconds (4 photos + framed composites) | Multi-core Sharp (libvips) pipeline with concurrency bounds. |
| **Live Remote Viewfinder** | < 500 Kbps per stream | ~350 Kbps at 15 FPS | Scaled down JPEG preview frames over binary WebSocket frames. |

---

## 2. Client-Side Optimizations

### 2.1 Asynchronous Offline Queuing
The booth client never blocks user interaction while waiting for network uploads:
1. When a session ends, raw high-res images are stored to local temporary disk and registered in the client's embedded SQLite database (`queue.db`).
2. An autonomous background worker manages upload transfers without impeding the countdown or camera viewfinder.
3. If internet connectivity drops entirely, the booth continues taking photos indefinitely. Captures accumulate in `queue.db` and sync automatically as soon as the connection recovers.

### 2.2 Upload Telemetry & Progress
The client calculates real-time network throughput and reports progress to the operator dashboard via Socket.IO:
- `upload_avg_speed_kbps`: Moving average of upload throughput.
- `size_bytes`: Total byte payload.
- `elapsed` and `eta`: Estimated time to completion.

### 2.3 Simulated Network Degradation (QA Testing)
The client includes advanced developer tools in Settings (`Cmd/Ctrl+Shift+S`):
- Inject artificial latency (0 - 5000 ms)
- Throttled upload speed limits (Kbps)
- Packet loss simulation (%)
- Server error simulation (%)
- Simulated offline mode to verify graceful booth degradation.

---

## 3. Server-Side Image Pipeline (Sharp)

Image processing is performed on the server by **Sharp (libvips)**, known for minimal memory footprint and fast multi-threaded execution.

```
Incoming Upload (JPEG/PNG)
            │
            ├────────────────────────────────────────┬────────────────────────────────────────┐
            ▼                                        ▼                                        ▼
    WebP Gallery Image                       Full-Res Framed JPEG                     WebP Thumbnail
  - WebP Quality: 75                       - JPEG Quality: 95                       - WebP Quality: 80
  - Effort: 4                              - Flatten background                     - Max Width: 1920px
  - Size: ~300 - 600 KB                    - Size: ~2 - 4 MB                        - Size: ~80 - 150 KB
  - Target: Mobile screen display          - Target: High-res print & archiving     - Target: Responsive grid cards
```

### 3.1 Bounded Concurrency Queue
To prevent memory exhaustion during simultaneous uploads from multiple booths, processing jobs run through an internal priority queue (`AsyncJobQueue`):
- `maxConcurrent`: Default is `3` simultaneous Sharp operations.
- Excess jobs queue in memory, preventing server CPU thrashing and out-of-memory crashes.

### 3.2 Dynamic Vector Overlays (SVG Compositing)
Frames and watermarks do not require intermediate rasterization:
- **Rounded Placeholders:** Computed using SVG `<rect rx="..." ry="..." fill="#fff" />` blended via Sharp's `dest-in` mask operator.
- **Dynamic Text Overlays:** Date, time, and session filenames are rendered as vector text layers composited directly onto the image buffer in memory.

---

## 4. HTTP Delivery & Streaming Downloads

### 4.1 Streaming ZIP Downloads (`archiver`)
When a guest or operator downloads an entire event or session gallery as a ZIP file, the archive is streamed directly to the HTTP response:

```typescript
const archive = archiver('zip', { zlib: { level: 6 } })
archive.pipe(res)
// Files appended on-the-fly without holding full ZIP in memory
```

- **Zero Memory Buffering:** Large multi-gigabyte event downloads consume less than 30 MB of server RAM.
- **Immediate Response:** Download starts instantly without pre-packing delays.

### 4.2 Aggressive HTTP Caching
Static and immutable media assets leverage production caching headers:
- `Cache-Control: public, max-age=31536000, immutable` for static assets (JavaScript, CSS, fonts, icons).
- Signed URLs (`generateSignedUrl`) specify time-based cache boundaries, ensuring cached CDN content invalidates when expired.

### 4.3 Brotli and Gzip Compression
Express applies compression middleware across all JSON payloads, reducing API bandwidth overhead by up to 80%.

---

## 5. Bandwidth Quotas & Live Preview Controls

Configured in `global_settings` and editable via the Operator Dashboard:

- **Admin Bandwidth Budget (`bw_limit_admin`):** Default `10,000 MB` / 15-minute window per IP.
- **Share Bandwidth Budget (`bw_limit_share`):** Default `100 MB` / 15-minute window per guest IP. Prevents automated bulk downloading or DoS attempts.
- **Live Preview Stream Cap (`remote_preview_max_viewers`):** Limits simultaneous viewers of the live camera viewfinder feed (default: 3). If no operator is viewing, the booth client stops streaming video frames to conserve booth uplink bandwidth.
