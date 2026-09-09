"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditAction = logAuditAction;
exports.addEventOperator = addEventOperator;
exports.listEventOperators = listEventOperators;
exports.getEventOperatorByToken = getEventOperatorByToken;
exports.deleteEventOperator = deleteEventOperator;
exports.createEvent = createEvent;
exports.updateEventById = updateEventById;
exports.updateEventSettingsById = updateEventSettingsById;
exports.getEvent = getEvent;
exports.getEventByOtp = getEventByOtp;
exports.listEvents = listEvents;
exports.endEvent = endEvent;
exports.deleteEvent = deleteEvent;
exports.ensurePhotoSession = ensurePhotoSession;
exports.reservePhotoSession = reservePhotoSession;
exports.updateUploadStatus = updateUploadStatus;
exports.setSessionDimensions = setSessionDimensions;
exports.getSessionDimensions = getSessionDimensions;
exports.getSessionUploadStatus = getSessionUploadStatus;
exports.getPhotoSession = getPhotoSession;
exports.listEventPhotoSessions = listEventPhotoSessions;
exports.archiveSession = archiveSession;
exports.restoreSession = restoreSession;
exports.getGlobalSettings = getGlobalSettings;
exports.updateGlobalSettings = updateGlobalSettings;
exports.getCameraSettings = getCameraSettings;
exports.updateCameraSettings = updateCameraSettings;
exports.closeDb = closeDb;
exports.regenerateSessionShareId = regenerateSessionShareId;
exports.createSessionShare = createSessionShare;
exports.getSessionShares = getSessionShares;
exports.setSessionShareStatus = setSessionShareStatus;
exports.deleteSessionShare = deleteSessionShare;
exports.getPhotoSessionByShareId = getPhotoSessionByShareId;
exports.logShareAnalytics = logShareAnalytics;
exports.getEventAnalytics = getEventAnalytics;
exports.findUserByEmail = findUserByEmail;
exports.insertUser = insertUser;
exports.getAllUsers = getAllUsers;
exports.deleteUser = deleteUser;
exports.countUsers = countUsers;
exports.updateUserRole = updateUserRole;
exports.setEventShareOriginals = setEventShareOriginals;
exports.getOrCreateEventShareToken = getOrCreateEventShareToken;
exports.getEventIdByShareToken = getEventIdByShareToken;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const config_1 = require("./config");
const logger_1 = require("./logger");
const dbDir = path_1.default.join(config_1.config.storage.logs, '..', 'db');
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path_1.default.join(dbDir, 'snapsync.db');
const db = new better_sqlite3_1.default(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
// Remove old tables
db.exec(`DROP TABLE IF EXISTS share_tokens`);
db.exec(`DROP TABLE IF EXISTS sessions`);
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    otp TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')),
    photo_count INTEGER NOT NULL DEFAULT 4,
    countdown INTEGER NOT NULL DEFAULT 5,
    capture_interval INTEGER NOT NULL DEFAULT 1,
    post_capture_preview INTEGER NOT NULL DEFAULT 2,
    dslr_iso TEXT NOT NULL DEFAULT 'auto',
    dslr_shutterspeed TEXT NOT NULL DEFAULT 'auto',
    dslr_aperture TEXT NOT NULL DEFAULT 'auto',
    dslr_focus_mode TEXT NOT NULL DEFAULT 'auto',
    dslr_whitebalance TEXT NOT NULL DEFAULT 'auto',
    dslr_whitebalance_kelvin INTEGER NOT NULL DEFAULT 5200,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    share_originals INTEGER NOT NULL DEFAULT 1
  )
`);
try {
    db.exec(`ALTER TABLE events ADD COLUMN share_originals INTEGER NOT NULL DEFAULT 1`);
}
catch (e) {
    // Column already exists
}
db.exec(`
  CREATE TABLE IF NOT EXISTS global_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    photo_count INTEGER NOT NULL DEFAULT 4,
    countdown INTEGER NOT NULL DEFAULT 5,
    capture_interval INTEGER NOT NULL DEFAULT 1,
    post_capture_preview INTEGER NOT NULL DEFAULT 2,
    dslr_iso TEXT NOT NULL DEFAULT 'auto',
    dslr_shutterspeed TEXT NOT NULL DEFAULT 'auto',
    dslr_aperture TEXT NOT NULL DEFAULT 'auto',
    dslr_focus_mode TEXT NOT NULL DEFAULT 'auto',
    dslr_whitebalance TEXT NOT NULL DEFAULT 'auto',
    dslr_whitebalance_kelvin INTEGER NOT NULL DEFAULT 5200
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS camera_settings (
    model TEXT PRIMARY KEY,
    dslr_iso TEXT NOT NULL DEFAULT 'auto',
    dslr_shutterspeed TEXT NOT NULL DEFAULT 'auto',
    dslr_aperture TEXT NOT NULL DEFAULT 'auto',
    dslr_focus_mode TEXT NOT NULL DEFAULT 'auto',
    dslr_whitebalance TEXT NOT NULL DEFAULT 'auto',
    dslr_whitebalance_kelvin INTEGER NOT NULL DEFAULT 5200,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);
function logAuditAction(userEmail, action, ipAddress, details) {
    try {
        const stmt = db.prepare(`
      INSERT INTO audit_log (user_email, action, ip_address, details)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(userEmail, action, ipAddress, details ? JSON.stringify(details) : null);
    }
    catch (error) {
        logger_1.logger.error('Failed to write audit log', { error });
    }
}
// Add new columns if missing (for existing DBs)
try {
    db.exec(`ALTER TABLE events ADD COLUMN photo_count INTEGER NOT NULL DEFAULT 4`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN countdown INTEGER NOT NULL DEFAULT 5`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN capture_interval INTEGER NOT NULL DEFAULT 1`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN post_capture_preview INTEGER NOT NULL DEFAULT 2`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN dslr_iso TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN dslr_shutterspeed TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN dslr_aperture TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN dslr_focus_mode TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN dslr_aperture TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN dslr_focus_mode TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN dslr_whitebalance TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN dslr_whitebalance TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE camera_settings ADD COLUMN dslr_whitebalance TEXT NOT NULL DEFAULT 'auto'`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN dslr_whitebalance_kelvin INTEGER NOT NULL DEFAULT 5200`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN obfuscate_links INTEGER NOT NULL DEFAULT 0`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN expiry_type TEXT NOT NULL DEFAULT 'none'`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN expiry_value TEXT NOT NULL DEFAULT ''`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN organizer TEXT NOT NULL DEFAULT ''`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN contact_info TEXT NOT NULL DEFAULT ''`);
}
catch { }
try {
    db.exec(`ALTER TABLE events ADD COLUMN operator_password TEXT`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN dslr_whitebalance_kelvin INTEGER NOT NULL DEFAULT 5200`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN organizer TEXT NOT NULL DEFAULT ''`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN contact_info TEXT NOT NULL DEFAULT ''`);
}
catch { }
// Phase 2: Rate Limits & Bandwidth
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN api_rate_limit_admin INTEGER NOT NULL DEFAULT 500`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN api_rate_limit_share INTEGER NOT NULL DEFAULT 300`);
}
catch { }
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN bw_limit_admin INTEGER NOT NULL DEFAULT 1000`);
}
catch { } // in MB/15m
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN bw_limit_share INTEGER NOT NULL DEFAULT 100`);
}
catch { } // in MB/15m
try {
    db.exec(`ALTER TABLE global_settings ADD COLUMN lockout_duration INTEGER NOT NULL DEFAULT 5`);
}
catch { } // in minutes
try {
    db.exec(`ALTER TABLE camera_settings ADD COLUMN dslr_whitebalance_kelvin INTEGER NOT NULL DEFAULT 5200`);
}
catch { }
// Seed defaults row
db.exec(`
  INSERT OR IGNORE INTO global_settings (id, photo_count, countdown, capture_interval, post_capture_preview, dslr_iso, dslr_shutterspeed, dslr_aperture, dslr_focus_mode, dslr_whitebalance, dslr_whitebalance_kelvin)
  VALUES (1, 4, 5, 1, 2, 'auto', 'auto', 'auto', 'auto', 'auto', 5200) /* organizer/contact_info added below */
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS photo_sessions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_photo_sessions_event
    ON photo_sessions(event_id)
`);
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN share_id TEXT`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN upload_status TEXT NOT NULL DEFAULT 'reserved'`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN upload_started_at INTEGER`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN upload_completed_at INTEGER`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN upload_size_bytes INTEGER`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN upload_avg_speed_kbps REAL`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN width INTEGER NOT NULL DEFAULT 0`);
}
catch { }
try {
    db.exec(`ALTER TABLE photo_sessions ADD COLUMN height INTEGER NOT NULL DEFAULT 0`);
}
catch { }
db.exec(`
  CREATE TABLE IF NOT EXISTS event_shares (
    token TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_sessions_share_id
    ON photo_sessions(share_id)
    WHERE share_id IS NOT NULL
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS session_shares (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
try {
    const existingWithShareId = db.prepare('SELECT id, share_id, created_at FROM photo_sessions WHERE share_id IS NOT NULL').all();
    const checkShare = db.prepare('SELECT 1 FROM session_shares WHERE id = ?');
    const insertShare = db.prepare('INSERT INTO session_shares (id, session_id, is_active, created_at) VALUES (?, ?, 1, ?)');
    db.transaction(() => {
        for (const session of existingWithShareId) {
            if (!checkShare.get(session.share_id)) {
                insertShare.run(session.share_id, session.id, session.created_at);
            }
        }
    })();
}
catch (e) {
    logger_1.logger.error('Migration failed for session_shares', e);
}
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','operator')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS share_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_id TEXT NOT NULL,
    ip_address TEXT,
    device_type TEXT,
    os TEXT,
    browser TEXT,
    action TEXT NOT NULL,
    target_file TEXT,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS event_operators (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    access_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
  )
`);
const insertEvent = db.prepare(`
  INSERT INTO events (id, name, date, description, otp, status, photo_count, countdown, capture_interval, post_capture_preview, dslr_iso, dslr_shutterspeed, dslr_aperture, dslr_focus_mode, dslr_whitebalance, dslr_whitebalance_kelvin, obfuscate_links, expiry_type, expiry_value, organizer, contact_info)
  VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateEvent = db.prepare(`
  UPDATE events SET name = ?, date = ?, description = ?, photo_count = ?, countdown = ?, capture_interval = ?, post_capture_preview = ?, dslr_iso = ?, dslr_shutterspeed = ?, dslr_aperture = ?, dslr_focus_mode = ?, dslr_whitebalance = ?, dslr_whitebalance_kelvin = ?, obfuscate_links = ?, expiry_type = ?, expiry_value = ?, organizer = ?, contact_info = ? WHERE id = ?
`);
const updateEventSettings = db.prepare(`
  UPDATE events SET photo_count = ?, countdown = ?, capture_interval = ?, post_capture_preview = ?, dslr_iso = ?, dslr_shutterspeed = ?, dslr_aperture = ?, dslr_focus_mode = ?, dslr_whitebalance = ?, dslr_whitebalance_kelvin = ?, obfuscate_links = ?, expiry_type = ?, expiry_value = ?, organizer = ?, contact_info = ? WHERE id = ?
`);
const findEventById = db.prepare('SELECT * FROM events WHERE id = ?');
const findEventByOtp = db.prepare('SELECT * FROM events WHERE otp = ? AND status = \'active\'');
const listActiveEvents = db.prepare("SELECT * FROM events WHERE status = 'active' ORDER BY created_at DESC");
const listAllEvents = db.prepare('SELECT * FROM events ORDER BY created_at DESC');
const endEventStmt = db.prepare("UPDATE events SET status = 'ended' WHERE id = ?");
const deleteEventStmt = db.prepare('DELETE FROM events WHERE id = ?');
const archiveSessionStmt = db.prepare("UPDATE photo_sessions SET archived = 1 WHERE id = ?");
const restoreSessionStmt = db.prepare("UPDATE photo_sessions SET archived = 0 WHERE id = ?");
const insertOperatorStmt = db.prepare('INSERT INTO event_operators (id, event_id, name, password_hash, access_token) VALUES (?, ?, ?, ?, ?)');
const listOperatorsStmt = db.prepare('SELECT id, event_id, name, access_token, created_at FROM event_operators WHERE event_id = ? ORDER BY created_at ASC');
const getOperatorByTokenStmt = db.prepare('SELECT * FROM event_operators WHERE access_token = ?');
const deleteOperatorStmt = db.prepare('DELETE FROM event_operators WHERE id = ? AND event_id = ?');
function addEventOperator(eventId, name, passwordHash, accessToken) {
    const id = `op_${Date.now()}_${(0, crypto_1.randomInt)(1000, 9999)}`;
    insertOperatorStmt.run(id, eventId, name, passwordHash, accessToken);
    return id;
}
function listEventOperators(eventId) {
    return listOperatorsStmt.all(eventId);
}
function getEventOperatorByToken(token) {
    return getOperatorByTokenStmt.get(token);
}
function deleteEventOperator(id, eventId) {
    deleteOperatorStmt.run(id, eventId);
}
const insertPhotoSession = db.prepare(`
  INSERT INTO photo_sessions (id, event_id, share_id) VALUES (?, ?, ?)
`);
const findPhotoSession = db.prepare('SELECT * FROM photo_sessions WHERE id = ?');
const findPhotoSessionByShareId = db.prepare('SELECT * FROM photo_sessions WHERE share_id = ?');
const listPhotoSessionsByEvent = db.prepare('SELECT * FROM photo_sessions WHERE event_id = ? ORDER BY created_at DESC');
const listActivePhotoSessionsByEvent = db.prepare("SELECT * FROM photo_sessions WHERE event_id = ? AND archived = 0 ORDER BY created_at DESC");
function generateOtp() {
    const digits = (0, crypto_1.randomInt)(0, 1000000).toString().padStart(6, '0');
    const exists = db.prepare('SELECT 1 FROM events WHERE otp = ?').get(digits);
    if (exists)
        return generateOtp();
    return digits;
}
function createEvent(name, date, description, settings) {
    const id = `evt_${Date.now()}_${(0, crypto_1.randomInt)(1000, 9999)}`;
    const otp = generateOtp();
    const defaults = getGlobalSettings();
    const photoCount = settings?.photoCount ?? defaults.photoCount;
    const countdown = settings?.countdown ?? defaults.countdown;
    const captureInterval = settings?.captureInterval ?? defaults.captureInterval;
    const postCapturePreview = settings?.postCapturePreview ?? defaults.postCapturePreview;
    const dslrIso = settings?.dslrIso ?? defaults.dslrIso;
    const dslrShutterSpeed = settings?.dslrShutterSpeed ?? defaults.dslrShutterSpeed;
    const dslrAperture = settings?.dslrAperture ?? defaults.dslrAperture;
    const dslrFocusMode = settings?.dslrFocusMode ?? defaults.dslrFocusMode;
    const dslrWhiteBalance = settings?.dslrWhiteBalance ?? defaults.dslrWhiteBalance;
    const dslrWhiteBalanceKelvin = settings?.dslrWhiteBalanceKelvin ?? defaults.dslrWhiteBalanceKelvin;
    const obfuscateLinks = settings?.obfuscateLinks ?? 0;
    const expiryType = settings?.expiryType ?? 'none';
    const expiryValue = settings?.expiryValue ?? '';
    insertEvent.run(id, name, date, description, otp, photoCount, countdown, captureInterval, postCapturePreview, dslrIso, dslrShutterSpeed, dslrAperture, dslrFocusMode, dslrWhiteBalance, dslrWhiteBalanceKelvin, obfuscateLinks, expiryType, expiryValue, settings?.organizer ?? '', settings?.contactInfo ?? '');
    logger_1.logger.info(`Event created: ${id} (${name}) otp=${otp}`);
    return { id, otp };
}
function updateEventById(id, name, date, description, settings) {
    const existing = getEvent(id);
    updateEvent.run(name, date, description, settings?.photoCount ?? existing.photo_count, settings?.countdown ?? existing.countdown, settings?.captureInterval ?? existing.capture_interval, settings?.postCapturePreview ?? existing.post_capture_preview, settings?.dslrIso ?? existing.dslr_iso, settings?.dslrShutterSpeed ?? existing.dslr_shutterspeed, settings?.dslrAperture ?? existing.dslr_aperture, settings?.dslrFocusMode ?? existing.dslr_focus_mode, settings?.dslrWhiteBalance ?? existing.dslr_whitebalance, settings?.dslrWhiteBalanceKelvin ?? existing.dslr_whitebalance_kelvin, settings?.obfuscateLinks ?? existing.obfuscate_links, settings?.expiryType ?? existing.expiry_type, settings?.expiryValue ?? existing.expiry_value, settings?.organizer ?? existing.organizer, settings?.contactInfo ?? existing.contact_info, id);
}
function updateEventSettingsById(id, settings) {
    const existing = getEvent(id);
    updateEventSettings.run(settings.photoCount, settings.countdown, settings.captureInterval, settings.postCapturePreview, settings.dslrIso, settings.dslrShutterSpeed, settings.dslrAperture, settings.dslrFocusMode ?? existing.dslr_focus_mode, settings.dslrWhiteBalance ?? existing.dslr_whitebalance ?? 'auto', settings.dslrWhiteBalanceKelvin ?? existing.dslr_whitebalance_kelvin ?? 5200, settings.obfuscateLinks ?? existing.obfuscate_links ?? 0, settings.expiryType ?? existing.expiry_type ?? 'none', settings.expiryValue ?? existing.expiry_value ?? '', settings.organizer ?? existing.organizer ?? '', settings.contactInfo ?? existing.contact_info ?? '', id);
}
function getEvent(id) {
    return findEventById.get(id);
}
function getEventByOtp(otp) {
    return findEventByOtp.get(otp);
}
function listEvents(includeEnded = false) {
    const stmt = includeEnded ? listAllEvents : listActiveEvents;
    return stmt.all();
}
function endEvent(id) {
    endEventStmt.run(id);
    logger_1.logger.info(`Event ended: ${id}`);
}
function deleteEvent(id) {
    deleteEventStmt.run(id);
    logger_1.logger.info(`Event deleted: ${id}`);
}
function ensurePhotoSession(sessionId, eventId) {
    const existing = findPhotoSession.get(sessionId);
    if (existing) {
        const hasShares = db.prepare('SELECT 1 FROM session_shares WHERE session_id = ?').get(sessionId);
        let shareId = existing.share_id;
        if (!shareId) {
            shareId = require('uuid').v4();
            db.prepare('UPDATE photo_sessions SET share_id = ? WHERE id = ?').run(shareId, sessionId);
        }
        if (!hasShares) {
            db.prepare("INSERT OR IGNORE INTO session_shares (id, session_id, is_active, created_at) VALUES (?, ?, 1, datetime('now'))").run(shareId, sessionId);
        }
        return shareId;
    }
    const shareId = require('uuid').v4();
    insertPhotoSession.run(sessionId, eventId, shareId);
    db.prepare("INSERT INTO session_shares (id, session_id, is_active, created_at) VALUES (?, ?, 1, datetime('now'))").run(shareId, sessionId);
    return shareId;
}
function reservePhotoSession(sessionId, eventId) {
    const existing = findPhotoSession.get(sessionId);
    if (existing)
        return existing.share_id;
    const shareId = require('uuid').v4();
    insertPhotoSession.run(sessionId, eventId, shareId);
    db.prepare("INSERT INTO session_shares (id, session_id, is_active, created_at) VALUES (?, ?, 1, datetime('now'))").run(shareId, sessionId);
    return shareId;
}
function updateUploadStatus(sessionId, status, extra) {
    const fields = ['upload_status = ?'];
    const values = [status];
    if (extra?.upload_started_at !== undefined) {
        fields.push('upload_started_at = ?');
        values.push(extra.upload_started_at);
    }
    if (extra?.upload_completed_at !== undefined) {
        fields.push('upload_completed_at = ?');
        values.push(extra.upload_completed_at);
    }
    if (extra?.upload_size_bytes !== undefined) {
        fields.push('upload_size_bytes = ?');
        values.push(extra.upload_size_bytes);
    }
    if (extra?.upload_avg_speed_kbps !== undefined) {
        fields.push('upload_avg_speed_kbps = ?');
        values.push(extra.upload_avg_speed_kbps);
    }
    values.push(sessionId);
    db.prepare(`UPDATE photo_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}
const setSessionDimensionsStmt = db.prepare(`UPDATE photo_sessions SET width = ?, height = ? WHERE id = ?`);
function setSessionDimensions(sessionId, width, height) {
    setSessionDimensionsStmt.run(width, height, sessionId);
}
const getSessionDimensionsStmt = db.prepare('SELECT width, height FROM photo_sessions WHERE id = ?');
function getSessionDimensions(sessionId) {
    const row = getSessionDimensionsStmt.get(sessionId);
    return { width: row?.width || 0, height: row?.height || 0 };
}
function getSessionUploadStatus(token) {
    // Try by shareId via session_shares first
    let row = db.prepare(`
    SELECT ps.id, ps.upload_status, ps.upload_started_at, ps.upload_completed_at,
           ps.upload_size_bytes, ps.upload_avg_speed_kbps, ss.id as share_id
    FROM photo_sessions ps
    JOIN session_shares ss ON ss.session_id = ps.id
    WHERE ss.id = ? AND ss.is_active = 1
  `).get(token);
    if (!row) {
        row = db.prepare(`
      SELECT ps.id, ps.upload_status, ps.upload_started_at, ps.upload_completed_at,
             ps.upload_size_bytes, ps.upload_avg_speed_kbps, ss.id as share_id
      FROM photo_sessions ps
      LEFT JOIN session_shares ss ON ss.session_id = ps.id AND ss.is_active = 1
      WHERE ps.id = ?
    `).get(token);
    }
    return row || null;
}
function getPhotoSession(sessionId) {
    return findPhotoSession.get(sessionId);
}
function listEventPhotoSessions(eventId, includeArchived = false) {
    const stmt = includeArchived ? listPhotoSessionsByEvent : listActivePhotoSessionsByEvent;
    return stmt.all(eventId);
}
function archiveSession(sessionId) {
    archiveSessionStmt.run(sessionId);
}
function restoreSession(sessionId) {
    restoreSessionStmt.run(sessionId);
}
const getDefaultsStmt = db.prepare('SELECT * FROM global_settings WHERE id = 1');
const upsertDefaultsStmt = db.prepare(`
  INSERT INTO global_settings (id, photo_count, countdown, capture_interval, post_capture_preview, dslr_iso, dslr_shutterspeed, dslr_aperture, dslr_focus_mode, dslr_whitebalance, dslr_whitebalance_kelvin, organizer, contact_info, api_rate_limit_admin, api_rate_limit_share, bw_limit_admin, bw_limit_share, lockout_duration)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    photo_count = excluded.photo_count,
    countdown = excluded.countdown,
    capture_interval = excluded.capture_interval,
    post_capture_preview = excluded.post_capture_preview,
    dslr_iso = excluded.dslr_iso,
    dslr_shutterspeed = excluded.dslr_shutterspeed,
    dslr_aperture = excluded.dslr_aperture,
    dslr_focus_mode = excluded.dslr_focus_mode,
    dslr_whitebalance = excluded.dslr_whitebalance,
    dslr_whitebalance_kelvin = excluded.dslr_whitebalance_kelvin,
    organizer = excluded.organizer,
    contact_info = excluded.contact_info,
    api_rate_limit_admin = excluded.api_rate_limit_admin,
    api_rate_limit_share = excluded.api_rate_limit_share,
    bw_limit_admin = excluded.bw_limit_admin,
    bw_limit_share = excluded.bw_limit_share,
    lockout_duration = excluded.lockout_duration
`);
function getGlobalSettings() {
    const row = getDefaultsStmt.get();
    return {
        photoCount: row?.photo_count ?? 4,
        countdown: row?.countdown ?? 5,
        captureInterval: row?.capture_interval ?? 1,
        postCapturePreview: row?.post_capture_preview ?? 2,
        dslrIso: row?.dslr_iso ?? 'auto',
        dslrShutterSpeed: row?.dslr_shutterspeed ?? 'auto',
        dslrAperture: row?.dslr_aperture ?? 'auto',
        dslrFocusMode: row?.dslr_focus_mode ?? 'auto',
        dslrWhiteBalance: row?.dslr_whitebalance ?? 'auto',
        dslrWhiteBalanceKelvin: row?.dslr_whitebalance_kelvin ?? 5200,
        organizer: row?.organizer ?? '',
        contactInfo: row?.contact_info ?? '',
        apiRateLimitAdmin: row?.api_rate_limit_admin ?? 500,
        apiRateLimitShare: row?.api_rate_limit_share ?? 300,
        bwLimitAdmin: row?.bw_limit_admin ?? 1000,
        bwLimitShare: row?.bw_limit_share ?? 100,
        lockoutDuration: row?.lockout_duration ?? 5,
    };
}
function updateGlobalSettings(settings) {
    upsertDefaultsStmt.run(settings.photoCount, settings.countdown, settings.captureInterval, settings.postCapturePreview, settings.dslrIso, settings.dslrShutterSpeed, settings.dslrAperture, settings.dslrFocusMode ?? 'auto', settings.dslrWhiteBalance ?? 'auto', settings.dslrWhiteBalanceKelvin ?? 5200, settings.organizer ?? '', settings.contactInfo ?? '', settings.apiRateLimitAdmin ?? 500, settings.apiRateLimitShare ?? 300, settings.bwLimitAdmin ?? 1000, settings.bwLimitShare ?? 100, settings.lockoutDuration ?? 5);
    logger_1.logger.info('Global defaults updated', settings);
}
const getCameraSettingsStmt = db.prepare('SELECT * FROM camera_settings WHERE model = ?');
const upsertCameraSettingsStmt = db.prepare(`
  INSERT INTO camera_settings (model, dslr_iso, dslr_shutterspeed, dslr_aperture, dslr_focus_mode, dslr_whitebalance, dslr_whitebalance_kelvin, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(model) DO UPDATE SET
    dslr_iso = excluded.dslr_iso,
    dslr_shutterspeed = excluded.dslr_shutterspeed,
    dslr_aperture = excluded.dslr_aperture,
    dslr_focus_mode = excluded.dslr_focus_mode,
    dslr_whitebalance = excluded.dslr_whitebalance,
    dslr_whitebalance_kelvin = excluded.dslr_whitebalance_kelvin,
    updated_at = excluded.updated_at
`);
function getCameraSettings(model) {
    const row = getCameraSettingsStmt.get(model);
    if (!row)
        return null;
    return {
        dslrIso: row.dslr_iso,
        dslrShutterSpeed: row.dslr_shutterspeed,
        dslrAperture: row.dslr_aperture,
        dslrFocusMode: row.dslr_focus_mode,
        dslrWhiteBalance: row.dslr_whitebalance,
        dslrWhiteBalanceKelvin: row.dslr_whitebalance_kelvin,
    };
}
function updateCameraSettings(model, settings) {
    upsertCameraSettingsStmt.run(model, settings.dslrIso, settings.dslrShutterSpeed, settings.dslrAperture, settings.dslrFocusMode ?? 'auto', settings.dslrWhiteBalance ?? 'auto', settings.dslrWhiteBalanceKelvin ?? 5200);
    logger_1.logger.info(`Camera settings updated for model ${model}`, settings);
}
function closeDb() {
    db.close();
}
function regenerateSessionShareId(sessionId) {
    // Legacy function: We now use createSessionShare
    const newShareId = (0, crypto_1.randomBytes)(4).toString('hex');
    db.prepare('UPDATE photo_sessions SET share_id = ? WHERE id = ?').run(newShareId, sessionId);
    db.prepare('INSERT INTO session_shares (id, session_id, is_active, created_at) VALUES (?, ?, 1, datetime("now"))').run(newShareId, sessionId);
    return newShareId;
}
function createSessionShare(sessionId) {
    const shareId = (0, crypto_1.randomBytes)(4).toString('hex');
    db.prepare('INSERT INTO session_shares (id, session_id, is_active, created_at) VALUES (?, ?, 1, datetime("now"))').run(shareId, sessionId);
    return shareId;
}
function getSessionShares(sessionId) {
    return db.prepare('SELECT * FROM session_shares WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);
}
function setSessionShareStatus(shareId, isActive) {
    db.prepare('UPDATE session_shares SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, shareId);
}
function deleteSessionShare(shareId) {
    db.prepare('DELETE FROM session_shares WHERE id = ?').run(shareId);
}
function getPhotoSessionByShareId(shareId) {
    const share = db.prepare('SELECT * FROM session_shares WHERE id = ? AND is_active = 1').get(shareId);
    if (!share)
        return undefined;
    return findPhotoSession.get(share.session_id);
}
const insertShareAnalytics = db.prepare(`
  INSERT INTO share_analytics (share_id, ip_address, device_type, os, browser, action, target_file, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
function logShareAnalytics(shareId, ipAddress, deviceType, os, browser, action, targetFile = null, source = null) {
    insertShareAnalytics.run(shareId, ipAddress, deviceType, os, browser, action, targetFile, source);
}
const getEventShareIds = db.prepare(`
  SELECT share_id FROM photo_sessions WHERE event_id = ? AND share_id IS NOT NULL
`);
function getEventAnalytics(eventId) {
    const shareIds = getEventShareIds.all(eventId).map(r => r.share_id);
    if (shareIds.length === 0)
        return { totalVisits: 0, uniqueVisitors: 0, logs: [] };
    const placeholders = shareIds.map(() => '?').join(',');
    const totalVisits = db.prepare(`
    SELECT COUNT(*) as count FROM share_analytics WHERE share_id IN (${placeholders}) AND action = 'view'
  `).get(...shareIds).count;
    const uniqueVisitors = db.prepare(`
    SELECT COUNT(DISTINCT ip_address) as count FROM share_analytics WHERE share_id IN (${placeholders}) AND ip_address IS NOT NULL
  `).get(...shareIds).count;
    const logs = db.prepare(`
    SELECT * FROM share_analytics WHERE share_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100
  `).all(...shareIds);
    return { totalVisits, uniqueVisitors, logs };
}
const findUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUserStmt = db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)');
const getAllUsersStmt = db.prepare('SELECT id, email, role, created_at FROM users');
const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');
const updateUserRoleStmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
function findUserByEmail(email) {
    return findUserByEmailStmt.get(email);
}
function insertUser(id, email, passwordHash, role) {
    insertUserStmt.run(id, email, passwordHash, role);
}
function getAllUsers() {
    return getAllUsersStmt.all();
}
function deleteUser(id) {
    deleteUserStmt.run(id);
}
function countUsers() {
    return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
}
function updateUserRole(id, role) {
    updateUserRoleStmt.run(role, id);
}
function setEventShareOriginals(id, value) {
    try {
        db.prepare(`UPDATE events SET share_originals = ? WHERE id = ?`).run(value, id);
    }
    catch (e) {
        logger_1.logger.error('Failed to update share_originals: ' + e.message);
    }
}
function getOrCreateEventShareToken(eventId) {
    const existing = db.prepare('SELECT token FROM event_shares WHERE event_id = ?').get(eventId);
    if (existing)
        return existing.token;
    const token = require('uuid').v4();
    db.prepare('INSERT INTO event_shares (token, event_id) VALUES (?, ?)').run(token, eventId);
    return token;
}
function getEventIdByShareToken(token) {
    const row = db.prepare('SELECT event_id FROM event_shares WHERE token = ?').get(token);
    return row ? row.event_id : null;
}
