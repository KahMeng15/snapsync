import path from 'path'
import fs from 'fs'

const projectRoot = process.env.STORAGE_ROOT || path.resolve(process.cwd())

export { projectRoot }

export function parseDurationMs(duration: string | number | undefined, fallbackMs: number): number {
  if (typeof duration === 'number') return duration
  if (!duration || typeof duration !== 'string') return fallbackMs

  const match = duration.trim().match(/^(\d+)\s*(ms|s|m|h|d|w|y)?$/i)
  if (!match) return fallbackMs

  const val = parseInt(match[1], 10)
  const unit = (match[2] || 'ms').toLowerCase()

  switch (unit) {
    case 'ms': return val
    case 's': return val * 1000
    case 'm': return val * 60 * 1000
    case 'h': return val * 60 * 60 * 1000
    case 'd': return val * 24 * 60 * 60 * 1000
    case 'w': return val * 7 * 24 * 60 * 60 * 1000
    case 'y': return val * 365 * 24 * 60 * 60 * 1000
    default: return fallbackMs
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    get accessExpiryMs(): number {
      return parseDurationMs(this.accessExpiry, 24 * 60 * 60 * 1000)
    },
    get refreshExpiryMs(): number {
      return parseDurationMs(this.refreshExpiry, 7 * 24 * 60 * 60 * 1000)
    },
  },

  cookie: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: process.env.COOKIE_PATH || '/',
    sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  },

  operator: {
    email: process.env.OPERATOR_EMAIL || 'operator@snapsync.local',
    password: process.env.OPERATOR_PASSWORD || 'admin123',
  },

  storage: {
    photos: path.join(projectRoot, 'storage/photos'),
    frames: path.join(projectRoot, 'storage/frames'),
    logs: path.join(projectRoot, 'storage/logs'),
  },

  eventPhotosDir: (eventId: string) => path.join(projectRoot, 'storage/photos', eventId),
  eventFrames: (eventId: string) => path.join(projectRoot, 'storage/frames', eventId),
  eventFramedPhotos: (eventId: string) => path.join(projectRoot, 'storage/photos', eventId, 'framed'),

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
    thumbnailQuality: 80,
    stripQuality: 78,
    maxConcurrent: 3,
    thumbnailSize: 1920,
    gifFrameDelay: 500,
    gifMaxSize: 5 * 1024 * 1024,
  },
}
