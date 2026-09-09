"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.projectRoot = void 0;
const path_1 = __importDefault(require("path"));
const projectRoot = process.env.STORAGE_ROOT || path_1.default.resolve(process.cwd());
exports.projectRoot = projectRoot;
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret',
        refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh',
        accessExpiry: '15m',
        refreshExpiry: '7d',
    },
    cookie: {
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: process.env.COOKIE_PATH || '/',
        sameSite: (process.env.COOKIE_SAME_SITE || 'lax'),
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    },
    operator: {
        email: process.env.OPERATOR_EMAIL || 'operator@snapsync.local',
        password: process.env.OPERATOR_PASSWORD || 'admin123',
    },
    storage: {
        photos: path_1.default.join(projectRoot, 'storage/photos'),
        frames: path_1.default.join(projectRoot, 'storage/frames'),
        logs: path_1.default.join(projectRoot, 'storage/logs'),
    },
    eventPhotosDir: (eventId) => path_1.default.join(projectRoot, 'storage/photos', eventId),
    eventFrames: (eventId) => path_1.default.join(projectRoot, 'storage/frames', eventId),
    eventFramedPhotos: (eventId) => path_1.default.join(projectRoot, 'storage/photos', eventId, 'framed'),
    upload: {
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 10,
    },
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimit: {
        login: { max: 5, windowMs: 15 * 60 * 1000 },
        api: { max: 100, windowMs: 60 * 1000 },
    },
    security: {
        signedUrlSecret: process.env.SIGNED_URL_SECRET || 'dev-signed-url-secret',
    },
    imageProcessing: {
        webpQuality: 75,
        framedJpegQuality: 95,
        avifQuality: 60,
        thumbnailQuality: 60,
        stripQuality: 78,
        maxConcurrent: 3,
        thumbnailSize: 400,
        gifFrameDelay: 500,
        gifMaxSize: 5 * 1024 * 1024,
    },
};
