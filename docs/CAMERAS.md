# SnapSync Camera Support Guide — DSLR, Mirrorless & Webcam

SnapSync provides professional, tethered camera capture alongside a zero-configuration webcam mode. This document details supported hardware, platform prerequisites, camera body configuration, internal capture pipelines, and troubleshooting.

---

## 1. Capture Modes Comparison

| Feature | Webcam Mode | DSLR / Mirrorless Mode |
|---|---|---|
| **Setup Difficulty** | Zero setup (plug and play) | Requires USB cable + platform software |
| **Video Preview** | WebRTC stream (30–60 FPS) | Live preview stream (~15 FPS MJPEG) |
| **Image Resolution** | Typically 720p to 1080p | Full sensor resolution (24–60+ Megapixels) |
| **Optics & Lighting** | Fixed lens, digital exposure | Interchangeable lenses, optical bokeh, studio strobes & flashes |
| **Exposure Control** | Software auto-gain | Hardware ISO, Shutter Speed, Aperture, White Balance Kelvin |
| **Supported Backends** | HTML5 `getUserMedia` | macOS/Linux: `gphoto2` &bull; Windows: `DigiCamControl` |

---

## 2. Tested & Supported Hardware

### Tested Cameras

| Manufacturer | Model | Platform | USB Mode | Notes |
|---|---|---|---|---|
| **Canon** | EOS 80D | macOS, Windows, Linux | PC Connect / PTP | Outstanding reliability. Supports full exposure control. |
| **Canon** | EOS 5D Mark III / IV | macOS, Windows, Linux | PC Connect | Full hardware control. High-resolution captures. |
| **Canon** | Rebel T6 / T7 / 2000D | macOS, Windows, Linux | PC Connect | Budget friendly, highly reliable tethering. |
| **Sony** | A7R II / A7 III / A7 IV | macOS, Windows, Linux | PC Remote (MTP-NFS) | Requires setting *Still Img Save Dest* to PC+Camera. |
| **Nikon** | D750 / D850 / Z6 / Z7 | macOS, Windows, Linux | PTP / MTP | Full exposure and liveview support. |

*SnapSync works with any camera supported by [libgphoto2](https://gphoto.org/proj/libgphoto2/support.php) or [DigiCamControl](http://digicamcontrol.com/cameras).*

---

## 3. Platform Setup & Prerequisites

### 3.1 macOS Setup

SnapSync on macOS communicates with tethered cameras via the open-source `gphoto2` CLI.

1. **Install gphoto2 via Homebrew:**
   ```bash
   brew install gphoto2
   ```

2. **Verify Camera Detection:**
   Connect your camera via USB, power it on, and execute:
   ```bash
   gphoto2 --auto-detect
   ```
   *Expected output:*
   ```
   Model                          Port
   ----------------------------------------------------------
   Canon EOS 80D                  usb:020,006
   ```

3. **Release macOS PTP Daemons:**
   macOS automatically launches system services (`PTPCamera`, `com.apple.imagecaptured`) whenever a USB camera is plugged in. These lock the USB device and prevent `gphoto2` from opening the shutter.
   
   Run the included helper script before starting the booth:
   ```bash
   ./fix-camera-daemons.sh
   ```
   Or release them directly:
   ```bash
   killall PTPCamera 2>/dev/null; killall Image\ Capture\ Extension 2>/dev/null
   ```

> **Note on Packaged macOS Apps:** SnapSync includes automatic PATH resolution (`fixSystemPath()`) in the client main process. When launched from Finder or Spotlight, Homebrew directories (`/opt/homebrew/bin`, `/usr/local/bin`) are injected into the environment so `gphoto2` is found without manual configuration.

---

### 3.2 Windows Setup

On Windows, SnapSync integrates with **DigiCamControl** over a local HTTP loopback interface (`http://localhost:5513`).

1. **Bundled Out-of-the-Box:** When building the production Windows installer (`npm run make`), DigiCamControl is bundled into the distribution package. When the booth starts, the client automatically launches `CameraControl.exe /minimized` in the background.
2. **Development / Manual Setup:**
   - Download and install [DigiCamControl](http://digicamcontrol.com/download).
   - In DigiCamControl **Settings > Web Server**, ensure the HTTP server is enabled on port **5513** (default).
   - Connect your camera via USB. DigiCamControl will detect the camera model.

---

## 4. Camera Body Hardware Checklist

Before opening the booth, configure these settings directly on the camera body:

| Camera Body Setting | Recommended Value | Reason |
|---|---|---|
| **Image Quality** | **JPEG Fine** (or RAW+JPEG) | Fast USB transfer. Raw files are saved to SD; high-res JPEG is transferred to PC. |
| **Auto Power Off / Sleep** | **Disabled / Never** | Prevents camera entering standby between guest sessions. |
| **Focus Mode** | **AF-S (One-Shot) or Manual (MF)** | Prevents shutter release lag caused by continuous hunting in low light. |
| **Drive Mode** | **Single Shot** | Prevents unintended burst captures. |
| **Power Source** | **AC Dummy Battery / USB-C PD** | Avoids battery depletion during multi-hour events. |

### Manufacturer-Specific Tuning

- **Sony Alpha Series:**
  - `USB Connection` -> **PC Remote**
  - `PC Remote Settings` -> `Still Img Save Dest` -> **PC + Camera** (ensures backup on SD card).
  - `Auto Review` -> **Off** (drastically reduces capture turnaround time).
- **Canon EOS Series:**
  - `Interface` / `Communication` -> **PC connect**
  - Ensure lens image stabilization (IS) is toggled appropriately for tripod mounting.

---

## 5. Technical Pipeline & Shutter Sequence

```
Idle State
  │
  ├──► Live Viewfinder Stream (~15 FPS)
  │      macOS: gphoto2 --capture-preview → JPEG → Base64 IPC → Renderer <img>
  │      Windows: HTTP GET localhost:5513/liveview.jpg → Base64 IPC → Renderer <img>
  │
Capture Trigger (Countdown reaches 0)
  │
  ├── 1. Renderer halts liveview frame consumer
  ├── 2. IPC 'dslr-capture' dispatched to Electron main process
  ├── 3. Main process pauses liveview loop
  ├── 4. Hardware Shutter Fire:
  │      macOS: gphoto2 --capture-image-and-download --keep
  │      Windows: HTTP GET localhost:5513/camera1/capturenoaf
  ├── 5. High-resolution JPEG downloaded to OS temp folder
  ├── 6. Main process sends file path to renderer
  ├── 7. Renderer triggers flash overlay & post-capture review
  └── 8. Live viewfinder loop resumes for the next shot
```

---

## 6. Exposure & Color Controls (In-App)

Operators can adjust camera settings directly from the Booth Settings dialog (`Cmd/Ctrl+Shift+S`) or push overrides remotely from the Operator Dashboard:

- **ISO:** `auto`, `100`, `200`, `400`, `800`, `1600`, `3200`, `6400`
- **Shutter Speed:** `auto`, `1/60s`, `1/125s`, `1/160s`, `1/200s`, `1/250s` (sync speed for external flash)
- **Aperture:** `auto`, `f/2.8`, `f/4.0`, `f/5.6`, `f/8.0`, etc.
- **White Balance:** `auto`, `daylight`, `flash`, `tungsten`, `cloudy`, or **Kelvin** (2500K - 10000K, default: `5200K`).
- **Shutter Offset Delay:** Optional millisecond delay (0 - 500ms) to accommodate optical sync for external studio strobes.

---

## 7. Troubleshooting

### Camera Not Detected on macOS
1. Re-seat the USB cable. Use a direct port rather than unpowered USB hubs.
2. Verify macOS system services didn't hijack the camera:
   ```bash
   ./fix-camera-daemons.sh
   ```
3. Test terminal detection:
   ```bash
   gphoto2 --auto-detect
   ```
4. Check System Settings > Privacy & Security > Camera permissions for the Terminal / SnapSync app.

### Shutter Fails to Fire / "Device Busy"
- The camera may be attempting to autofocus in low contrast. Switch the lens to **Manual Focus (MF)** once pre-focused on the booth backdrop.
- Verify that the camera's memory card is not full or write-protected.

### Live View Shows Black Screen
- Lens cap is attached, or camera exposure is severely underexposed.
- PTP daemon seized the camera right before liveview initialization. Run `./fix-camera-daemons.sh` and click **Scan for Camera** in Settings.

### Windows: DigiCamControl API Not Responding
- Verify `CameraControl.exe` is running in the Windows Task Manager.
- Open `http://localhost:5513/camera1/` in your browser. If it doesn't respond, restart DigiCamControl and check firewall settings.
