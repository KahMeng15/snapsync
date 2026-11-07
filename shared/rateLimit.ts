import { Request, Response, NextFunction } from 'express'
import { getGlobalSettings } from './index'
import { logger } from './index'
import crypto from 'crypto'

const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface RateData {
  reqCount: number
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

function checkLimits(req: Request, res: Response, next: NextFunction, scope: 'admin' | 'share') {
  const clientId = getClientId(req)
  const now = Date.now()
  let data = clientData.get(clientId)

  if (!data || now > data.resetTime) {
    data = { reqCount: 0, bytesSent: 0, resetTime: now + WINDOW_MS }
  }

  // Check lockout
  if (data.lockedUntil && now < data.lockedUntil) {
    const remainingMs = data.lockedUntil - now
    const remainingMinutes = Math.ceil(remainingMs / 60000)
    const plural = remainingMinutes > 1 ? 's' : ''
    return res.status(429).json({ error: `You have been temporarily blocked due to excessive requests. Try again in ${remainingMinutes} minute${plural}.` })
  } else if (data.lockedUntil && now >= data.lockedUntil) {
    data.lockedUntil = undefined // remove lock
    data.reqCount = 0
    data.bytesSent = 0
    data.resetTime = now + WINDOW_MS
  }

  const settings = getGlobalSettings()
  
  const reqLimit = scope === 'admin' ? (settings.apiRateLimitAdmin ?? 2000) : (settings.apiRateLimitShare ?? 300)
  const bwLimit = scope === 'admin' ? (settings.bwLimitAdmin ?? 10000) : (settings.bwLimitShare ?? 100)
  const lockoutDur = (settings.lockoutDuration || 5) * 60 * 1000

  // Enforce both request count and bandwidth limits for all routes
  const isLimitExceeded = data.reqCount >= reqLimit || (data.bytesSent / (1024 * 1024)) >= bwLimit

  if (isLimitExceeded) {
    logger.warn(`Rate limit or bandwidth exceeded for ${clientId} in scope ${scope} (${data.reqCount}/${reqLimit} reqs, ${Math.round(data.bytesSent / (1024 * 1024))}/${bwLimit} MB). Locking out.`)
    data.lockedUntil = now + lockoutDur
    clientData.set(clientId, data)
    const lockoutMins = Math.ceil(lockoutDur / 60000)
    const plural = lockoutMins > 1 ? 's' : ''
    return res.status(429).json({ error: `You have been temporarily blocked due to excessive requests. Try again in ${lockoutMins} minute${plural}.` })
  }

  data.reqCount++
  clientData.set(clientId, data)

  // Accurately track bytes sent across both fixed-size headers and streaming responses
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

export const adminRateLimiter = (req: Request, res: Response, next: NextFunction) => checkLimits(req, res, next, 'admin')
export const shareRateLimiter = (req: Request, res: Response, next: NextFunction) => checkLimits(req, res, next, 'share')
