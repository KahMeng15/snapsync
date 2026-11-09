import type { Request, Response, NextFunction, RequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import { getGlobalSettings } from './index'
import { logger } from './index'
import crypto from 'crypto'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface RateData {
  bytesSent: number
  resetTime: number
  lockedUntil?: number
}

const clientData = new Map<string, RateData>()

function getClientId(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const ua = req.headers['user-agent'] || 'unknown'
  const uaHash = crypto.createHash('md5').update(ua).digest('hex')
  return `${ip}:${uaHash}`
}

export function checkBandwidthLimits(req: Request, res: Response, next: NextFunction, scope: 'admin' | 'share') {
  const clientId = getClientId(req)
  const now = Date.now()
  let data = clientData.get(clientId)

  if (!data || now > data.resetTime) {
    data = { bytesSent: 0, resetTime: now + WINDOW_MS }
  }

  if (data.lockedUntil && now < data.lockedUntil) {
    const remainingMs = data.lockedUntil - now
    const remainingMinutes = Math.ceil(remainingMs / 60000)
    const plural = remainingMinutes > 1 ? 's' : ''
    return res.status(429).json({ error: `You have been temporarily blocked due to excessive requests. Try again in ${remainingMinutes} minute${plural}.` })
  } else if (data.lockedUntil && now >= data.lockedUntil) {
    data.lockedUntil = undefined
    data.bytesSent = 0
    data.resetTime = now + WINDOW_MS
  }

  let bwLimit = 100
  let lockoutDur = 5 * 60 * 1000
  try {
    const settings = getGlobalSettings()
    bwLimit = scope === 'admin' ? (settings.bwLimitAdmin ?? 10000) : (settings.bwLimitShare ?? 100)
    lockoutDur = (settings.lockoutDuration || 5) * 60 * 1000
  } catch {}

  const isLimitExceeded = (data.bytesSent / (1024 * 1024)) >= bwLimit

  if (isLimitExceeded) {
    logger.warn(`Bandwidth exceeded for ${clientId} in scope ${scope} (${Math.round(data.bytesSent / (1024 * 1024))}/${bwLimit} MB). Locking out.`)
    data.lockedUntil = now + lockoutDur
    clientData.set(clientId, data)
    const lockoutMins = Math.ceil(lockoutDur / 60000)
    const plural = lockoutMins > 1 ? 's' : ''
    return res.status(429).json({ error: `You have been temporarily blocked due to excessive requests. Try again in ${lockoutMins} minute${plural}.` })
  }

  let streamedBytes = 0
  const origWrite = res.write
  const origEnd = res.end
  res.write = function (chunk: any, ...args: any[]) {
    if (chunk) streamedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk)
    return origWrite.apply(res, [chunk, ...args] as any)
  }
  res.end = function (chunk: any, ...args: any[]) {
    if (chunk) streamedBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk)
    return origEnd.apply(res, [chunk, ...args] as any)
  }

  res.on('finish', () => {
    const contentLength = res.get('Content-Length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : streamedBytes
    if (totalBytes) {
      data!.bytesSent += totalBytes
      clientData.set(clientId, data!)
    }
  })

  next()
}

export const adminRateLimiter: RequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  limit: () => {
    try {
      const settings = getGlobalSettings()
      return settings?.apiRateLimitAdmin ?? 2000
    } catch {
      return 2000
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message)
  },
}) as unknown as RequestHandler

export const shareRateLimiter: RequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  limit: () => {
    try {
      const settings = getGlobalSettings()
      return settings?.apiRateLimitShare ?? 300
    } catch {
      return 300
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message)
  },
}) as unknown as RequestHandler
