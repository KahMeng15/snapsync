# SnapSync Security Architecture & Threat Model

SnapSync is engineered for event reliability and privacy. This document outlines the security controls, authentication mechanisms, asset protection strategies, and vulnerability mitigations implemented across the platform.

---

## 1. Authentication & Session Management

### 1.1 JSON Web Tokens (JWT) & Token Rotation
Operator authentication uses an OAuth2-style access/refresh token cycle:

- **Access Token:** Short-lived (default `24h`), signed with `JWT_SECRET`. Contains user ID, email, role, and permission scope.
- **Refresh Token:** Long-lived (default `7d`), signed with `REFRESH_TOKEN_SECRET`. Used to renew access tokens seamlessly without re-prompting the user.
- **Storage:** Both tokens are delivered to the browser exclusively via `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) cookies. JavaScript cannot access the tokens directly, preventing Cross-Site Scripting (XSS) token extraction.

### 1.2 Password Hashing
All passwords (Super Admin, Admins, Operators, and Event-scoped operators) are hashed using **bcrypt** with 10 salt rounds before persistence to the SQLite database. Plaintext passwords are never logged or stored.

### 1.3 Booth Client Pairing (OTP Mechanism)
Capture booths connect without storing long-lived administrative credentials:
- When an event is created, a unique, cryptographically random **6-digit numeric OTP** is generated.
- The booth client enters this OTP to pair with the event via Socket.IO.
- The server validates the OTP against the `events` table (status must be `active`) and assigns the connection to that event's room.
- Operators can regenerate the OTP at any time from the dashboard, instantly severing any stale booth sessions.

---

## 2. Role-Based Access Control (RBAC)

SnapSync enforces strict permission boundaries across three administrative tiers and event-scoped credentials:

| Role / Credential | Scope | Capabilities |
|---|---|---|
| **Super Admin** | Global Instance | Full access. Can create/delete other admins, change system-level secrets, modify rate limits, and transfer ownership. |
| **Admin** | Global Instance | Can manage all events, users, global settings, view analytics, and trigger re-processing. |
| **Operator** | Global / Assigned | Can manage assigned events, trigger camera shutters, pause booths, and download media. Cannot manage users or global server settings. |
| **Event Operator Token** | Single Event | Scoped exclusively to a single event via URL token `/operator/:token`. Can operate remote controls and view event sessions. No access to other events. |

---

## 3. Cryptographic Asset Protection & Signed URLs

### 3.1 HMAC-SHA256 Signed URLs
Guest galleries must not expose public sequential IDs or allow scraping of unreleased event photos. All media URLs served by `snapsync-share` require cryptographic signatures:

```
/snapsync/api/share/photo/<token>/<fileId>?expires=<timestamp>&signature=<hmac_sha256>
```

- **Generation:** Generated using Node's `crypto.createHmac('sha256', SIGNED_URL_SECRET)`.
- **Payload:** Constructed from the share token, photo filename/ID, and Unix expiration timestamp.
- **Validation:** Every request recomputes the signature and checks that `now <= expires`. Tampered filenames, expired timestamps, or invalid tokens are rejected with `403 Forbidden`.
- **In-Memory Protection:** Prevents Insecure Direct Object References (IDOR) and mass scraping.

### 3.2 Link & File Obfuscation (`obfuscate_links`)
For sensitive or high-profile events, operators can enable **Obfuscate Links** in the event settings:
- Original session timestamps and camera filenames (`booth_20261107_120000.jpg`) are stripped from client payloads.
- Replaced with opaque indices (e.g., `framed_idx_0`, `idx_1`).
- The internal server route maps these opaque identifiers to real files on disk only after verifying the HMAC signature.

### 3.3 Multi-Token Instant Revocation
Each photo session can generate multiple unique share tokens. If a guest link is accidentally shared publicly or compromised:
- The operator can toggle that specific token to `Inactive` or delete it.
- Stale links return `404 Not Found` immediately, while other tokens for the same session remain functional.

---

## 4. Cross-Site Request Forgery (CSRF) Defense

For browser requests that rely on cookies (Admin & Upload endpoints), SnapSync implements the **Double-Submit Cookie Pattern**:

1. Upon any initial request, the server sets a random, cryptographically secure `csrf-token` cookie.
2. The frontend reads this cookie and includes its value in the `X-CSRF-Token` HTTP header on all state-changing requests (`POST`, `PUT`, `DELETE`).
3. The `csrfProtection` middleware checks that `req.headers['x-csrf-token'] === req.cookies['csrf-token']`.
4. Cross-origin requests from malicious third-party sites cannot read or supply this header, preventing CSRF attacks.

---

## 5. Brute-Force & Denial of Service (DoS) Mitigation

### 5.1 Account Lockout & Login Rate Limiting
- **Endpoint Protection:** The `/api/auth/login` endpoint is limited to 5 attempts per 15-minute window per IP.
- **Dynamic Lockout:** Repeated failed login attempts trigger an IP lockout recorded in the server's lockout table. The IP is blocked from authentication for `lockout_duration` minutes (configurable in global settings).
- **Successful Login:** Resets the failed attempt counter for that IP.

### 5.2 API & Share Rate Limiters
Express middleware and Nginx zones enforce layered request limits:
- **Admin Rate Limiter:** Protects `/api/admin/*` and `/api/upload/*` (default: 2,000 requests / 15 min).
- **Share Rate Limiter:** Protects public endpoints `/snapsync/api/share/*` (default: 300 requests / 15 min).
- **Bandwidth Budgeting:** Limits total MB transferred per IP within a 15-minute window (`bw_limit_admin`, `bw_limit_share`).

### 5.3 Live Preview Viewer Throttling
To protect server CPU and network bandwidth during live events:
- The operator dashboard limits concurrent live camera preview streams per event (`remote_preview_max_viewers`, default: 3).
- If all operators disconnect, the booth automatically stops streaming preview frames over WebSocket.

---

## 6. Audit Logging

Every administrative event is permanently recorded in the `audit_log` table:

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  action TEXT NOT NULL,
  ip_address TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Logged events include:
- Operator and admin logins (success and failures)
- Event creation, modifications, and deletions
- Frame template uploads and deletions
- Session deletions and restores
- User additions, privilege changes, and account disabling

---

## 7. HTTP Security Headers

SnapSync enforces strict HTTP response headers via Helmet:

| Header | Production Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS connections. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing. |
| `X-Frame-Options` | `DENY` | Protects against Clickjacking attacks. |
| `X-XSS-Protection` | `1; mode=block` | Enables legacy browser XSS filters. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Minimizes URL leakage in HTTP referrers. |
| `Content-Security-Policy` | Scoped script, style, connect, and image directives | Restricts unauthorized third-party script execution. |

---

## 8. Production Hardening Checklist

- [ ] **Rotate Default Passwords:** Change `operator@snapsync.local` / `admin123` immediately.
- [ ] **Generate Random Secrets:** Ensure `INTERNAL_API_SECRET`, `SIGNED_URL_SECRET`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` are random 64-character hex strings.
- [ ] **Enforce TLS/HTTPS:** Always deploy behind an HTTPS reverse proxy with valid certificates.
- [ ] **Restrict Network Exposure:** Keep port `3000` (Operator Hub) restricted to LAN or administrative VPNs, while port `3001` (Share) is exposed to the public.
- [ ] **Configure Allowed Origins:** Set `ALLOWED_ORIGINS` in `.env` to exact domains rather than wildcards.
- [ ] **Verify Storage Permissions:** Ensure `/storage` directories inside Docker have proper filesystem ownership (`chown -R 1000:1000 storage`).
