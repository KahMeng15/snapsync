"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareRateLimiter = exports.adminRateLimiter = void 0;
exports.checkBandwidthLimits = checkBandwidthLimits;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_1 = require("./index");
const index_2 = require("./index");
const crypto_1 = __importDefault(require("crypto"));
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const clientData = new Map();
function getClientId(req) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    const uaHash = crypto_1.default.createHash('md5').update(ua).digest('hex');
    return `${ip}:${uaHash}`;
}
function checkBandwidthLimits(req, res, next, scope) {
    const clientId = getClientId(req);
    const now = Date.now();
    let data = clientData.get(clientId);
    if (!data || now > data.resetTime) {
        data = { bytesSent: 0, resetTime: now + WINDOW_MS };
    }
    if (data.lockedUntil && now < data.lockedUntil) {
        const remainingMs = data.lockedUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        const plural = remainingMinutes > 1 ? 's' : '';
        return res.status(429).json({ error: `You have been temporarily blocked due to excessive requests. Try again in ${remainingMinutes} minute${plural}.` });
    }
    else if (data.lockedUntil && now >= data.lockedUntil) {
        data.lockedUntil = undefined;
        data.bytesSent = 0;
        data.resetTime = now + WINDOW_MS;
    }
    let bwLimit = 100;
    let lockoutDur = 5 * 60 * 1000;
    try {
        const settings = (0, index_1.getGlobalSettings)();
        bwLimit = scope === 'admin' ? (settings.bwLimitAdmin ?? 10000) : (settings.bwLimitShare ?? 100);
        lockoutDur = (settings.lockoutDuration || 5) * 60 * 1000;
    }
    catch { }
    const isLimitExceeded = (data.bytesSent / (1024 * 1024)) >= bwLimit;
    if (isLimitExceeded) {
        index_2.logger.warn(`Bandwidth exceeded for ${clientId} in scope ${scope} (${Math.round(data.bytesSent / (1024 * 1024))}/${bwLimit} MB). Locking out.`);
        data.lockedUntil = now + lockoutDur;
        clientData.set(clientId, data);
        const lockoutMins = Math.ceil(lockoutDur / 60000);
        const plural = lockoutMins > 1 ? 's' : '';
        return res.status(429).json({ error: `You have been temporarily blocked due to excessive requests. Try again in ${lockoutMins} minute${plural}.` });
    }
    let streamedBytes = 0;
    const origWrite = res.write;
    const origEnd = res.end;
    res.write = function (chunk, ...args) {
        if (chunk)
            streamedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        return origWrite.apply(res, [chunk, ...args]);
    };
    res.end = function (chunk, ...args) {
        if (chunk)
            streamedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        return origEnd.apply(res, [chunk, ...args]);
    };
    res.on('finish', () => {
        const contentLength = res.get('Content-Length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : streamedBytes;
        if (totalBytes) {
            data.bytesSent += totalBytes;
            clientData.set(clientId, data);
        }
    });
    next();
}
exports.adminRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: WINDOW_MS,
    limit: () => {
        try {
            const settings = (0, index_1.getGlobalSettings)();
            return settings?.apiRateLimitAdmin ?? 2000;
        }
        catch {
            return 2000;
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json(options.message);
    },
});
exports.shareRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: WINDOW_MS,
    limit: () => {
        try {
            const settings = (0, index_1.getGlobalSettings)();
            return settings?.apiRateLimitShare ?? 300;
        }
        catch {
            return 300;
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json(options.message);
    },
});
