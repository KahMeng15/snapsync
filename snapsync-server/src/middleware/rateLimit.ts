import rateLimit from 'express-rate-limit'
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { getGlobalSettings } from '@snapsync/shared'

const WINDOW_MS = 15 * 60 * 1000

export const adminRateLimiter: RequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  limit: () => {
    try {
      return getGlobalSettings()?.apiRateLimitAdmin ?? 2000
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
      return getGlobalSettings()?.apiRateLimitShare ?? 300
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

export { checkBandwidthLimits } from '@snapsync/shared'
