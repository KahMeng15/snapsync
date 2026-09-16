import express from 'express'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import cors from 'cors'
import path from 'path'
import jwt from 'jsonwebtoken'
import fs from 'fs'

import authRoutes from './routes/auth'
import uploadRoutes from './routes/upload'
import adminRoutes from './routes/admin'
import boothRoutes from './routes/booth'
import healthRoutes from './routes/health'
import internalRoutes from './routes/internal'
import shareRoutes from './routes/share'

import { authMiddleware } from './middleware/authMiddleware'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { csrfProtection, setCsrfToken } from './middleware/csrfMiddleware'
import { config, projectRoot, logger, getEventByOtp, getGlobalSettings } from '@snapsync/shared'

const app = express()

// Trust the reverse proxy (Nginx) so req.ip is correct for rate limiting
app.set('trust proxy', 1)

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: config.allowedOrigins,
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
})

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vue in some cases
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))
app.use(compression())
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}))

// Reduce limit to prevent DoS, 10mb is plenty for JSON payloads
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(cookieParser())
app.use(setCsrfToken)
app.use(requestLogger)

const publicPath = path.join(process.cwd(), 'public');
const staticOpts = { maxAge: '1y', etag: false, immutable: true, index: false };

app.use(express.static(publicPath, staticOpts));



const apiRouter = express.Router();
// Apply CSRF protection to routes that rely on cookies
import { adminRateLimiter, shareRateLimiter } from './middleware/rateLimit'

apiRouter.use('/auth', adminRateLimiter, csrfProtection, authRoutes)
apiRouter.use('/upload', adminRateLimiter, csrfProtection, authMiddleware, uploadRoutes)
apiRouter.use('/admin', adminRateLimiter, csrfProtection, authMiddleware, adminRoutes)

// Booth and Share do not use session cookies, so CSRF is not applicable
apiRouter.use('/booth', boothRoutes)
app.use('/internal', internalRoutes)
app.use('/api/share', shareRateLimiter, shareRoutes)

apiRouter.use('/health', healthRoutes)
apiRouter.use('/photos', adminRateLimiter, authMiddleware, express.static(config.storage.photos))


// Legacy Share Link Redirect
app.get('/share/:token', (req, res) => {
  if (process.env.VITE_SHARE_BASE_URL || process.env.SHARE_BASE_URL) {
    const base = process.env.VITE_SHARE_BASE_URL || `${process.env.SHARE_BASE_URL!.replace(/\/$/, '')}/share`;
    res.redirect(`${base.replace(/\/$/, '')}/${req.params.token}`)
  } else {
    res.status(404).send('Share base URL not configured')
  }
})

app.use('/api', apiRouter)


export interface BoothStateFull {
  state: 'idle' | 'live' | 'capturing' | 'preview' | 'paused'
  phase?: 'countdown' | 'taking-photo' | 'post-photo-preview' | 'post-session'
  shotCurrent?: number
  shotTotal?: number
  countdownValue?: number
  sessionId?: string
  sessionPhotoPaths?: string[]
  sessionThumbnails?: string[]
  shareUrl?: string
  uploadProgress?: {
    percent: number
    speed?: string
    eta?: string
    elapsed?: string
  }
  uploadQueue?: {
    uploading: number
    queued: number
    uploadedSessions: number
    uploadedImages: number
  }
}

// Track booth sockets per event
const boothSockets = new Map<string, Set<string>>()
const socketEventMap = new Map<string, string>()

// Track operator subscriptions per event
const operatorSubscriptions = new Map<string, Set<string>>()

// Caches for late-joining operators
const boothStateCache = new Map<string, BoothStateFull>()
const boothUploadCache = new Map<string, BoothStateFull['uploadProgress'] & { queue?: BoothStateFull['uploadQueue'] }>()

// Track preview stream viewers per event
const previewViewers = new Map<string, Set<string>>()

io.use((socket, next) => {
  const token = socket.handshake.auth.token
  const otp = socket.handshake.auth.otp

  if (token) {
    jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
      if (err) return next(new Error('Invalid token'))
      socket.data.user = decoded
      socket.data.role = 'operator'
      next()
    })
  } else if (otp) {
    const event = getEventByOtp(otp)
    if (!event) return next(new Error('Invalid or expired OTP'))
    socket.data.role = 'booth'
    socket.data.eventId = event.id
    next()
  } else {
    next(new Error('No auth token or OTP'))
  }
})

io.on('connection', (socket) => {
  if (socket.data.role === 'operator') {
    logger.info(`Operator connected: ${socket.id}`)
    socket.emit('booth-status', getBoothStatus())

    socket.on('subscribe', (eventId: string) => {
      if (!operatorSubscriptions.has(eventId)) {
        operatorSubscriptions.set(eventId, new Set())
      }
      operatorSubscriptions.get(eventId)!.add(socket.id)
      socket.data.subscribedEvents = socket.data.subscribedEvents || []
      socket.data.subscribedEvents.push(eventId)

      const hasBooth = boothSockets.has(eventId) && boothSockets.get(eventId)!.size > 0
      socket.emit('booth-connected', { eventId, connected: hasBooth })
      
      const cachedState = boothStateCache.get(eventId)
      if (cachedState) {
        socket.emit('booth-state', { ...cachedState, eventId })
      }
      const cachedUpload = boothUploadCache.get(eventId)
      if (cachedUpload) {
        const { queue, ...progress } = cachedUpload
        if (Object.keys(progress).length > 0) socket.emit('upload-progress', { ...progress, eventId })
        if (queue) socket.emit('queue-update', { ...queue, eventId })
      }
    })

    socket.on('unsubscribe', (eventId: string) => {
      operatorSubscriptions.get(eventId)?.delete(socket.id)
      previewViewers.get(eventId)?.delete(socket.id)
      if (previewViewers.get(eventId)?.size === 0) {
        forwardToBooth(eventId, { type: 'stop-preview-stream' })
      }
      if (socket.data.subscribedEvents) {
        socket.data.subscribedEvents = socket.data.subscribedEvents.filter((e: string) => e !== eventId)
      }
    })

    socket.on('frame-override', (data: { eventId: string; frameId: string }) => {
      forwardToBooth(data.eventId, { type: 'frame-override', frameId: data.frameId })
    })

    socket.on('trigger-reshot', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'reshot' })
    })

    socket.on('request-booth-config', (eventId: string) => {
      forwardToBooth(eventId, { type: 'request-config' })
    })

    socket.on('update-booth-config', (data: { eventId: string, config: any }) => {
      forwardToBooth(data.eventId, { type: 'update-config', config: data.config })
    })

    socket.on('booth-pause', (data: { eventId: string; paused: boolean }) => {
      forwardToBooth(data.eventId, { type: 'booth-pause', paused: data.paused })
      
      const subs = operatorSubscriptions.get(data.eventId)
      if (subs) {
        for (const sid of subs) {
          if (sid !== socket.id) io.to(sid).emit('booth-state', { state: data.paused ? 'paused' : 'idle', eventId: data.eventId })
        }
      }
    })

    socket.on('booth-capture', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'capture' })
    })

    socket.on('booth-start', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'start' })
    })

    socket.on('booth-go-home', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'go-home' })
    })

    socket.on('booth-stop', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'stop' })
    })

    socket.on('booth-cancel-countdown', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'cancel-countdown' })
    })

    
    socket.on('booth-enter-retake', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'enter-retake' })
    })

    socket.on('booth-update-retake', (data: { eventId: string, indices: number[] }) => {
      forwardToBooth(data.eventId, { type: 'update-retake', indices: data.indices })
    })

    socket.on('booth-cancel-retake', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'cancel-retake' })
    })

    socket.on('booth-retake', (data: { eventId: string, indices: number[] }) => {
      forwardToBooth(data.eventId, { type: 'retake', indices: data.indices })
    })

    socket.on('booth-show-qr', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'show-qr' })
    })

    socket.on('booth-hide-qr', (data: { eventId: string }) => {
      forwardToBooth(data.eventId, { type: 'hide-qr' })
    })

    socket.on('request-preview', async (data: { eventId: string }) => {
      const eventId = data.eventId
      if (!previewViewers.has(eventId)) {
        previewViewers.set(eventId, new Set())
      }
      
      const viewers = previewViewers.get(eventId)!
      const settings = await getGlobalSettings()
      
      if (viewers.size >= settings.remotePreviewMaxViewers) {
        socket.emit('preview-capacity')
        return
      }
      
      const isFirst = viewers.size === 0
      viewers.add(socket.id)
      
      if (isFirst) {
        forwardToBooth(eventId, { type: 'start-preview-stream' })
      }
    })

    socket.on('stop-preview', (data: { eventId: string }) => {
      const eventId = data.eventId
      previewViewers.get(eventId)?.delete(socket.id)
      if (previewViewers.get(eventId)?.size === 0) {
        forwardToBooth(eventId, { type: 'stop-preview-stream' })
      }
    })

    socket.on('resolve-booth-error', (data: { eventId: string; errorId: string; action: string }) => {
      forwardToBooth(data.eventId, { type: 'resolve-error', errorId: data.errorId, action: data.action })
      const subs = operatorSubscriptions.get(data.eventId)
      if (subs) {
        for (const sid of subs) {
          if (sid !== socket.id) io.to(sid).emit('booth-error-resolved', { errorId: data.errorId, action: data.action })
        }
      }
    })

    socket.on('disconnect', () => {
      logger.info(`Operator disconnected: ${socket.id}`)
      if (socket.data.subscribedEvents) {
        for (const eventId of socket.data.subscribedEvents) {
          operatorSubscriptions.get(eventId)?.delete(socket.id)
          
          if (previewViewers.has(eventId)) {
            previewViewers.get(eventId)?.delete(socket.id)
            if (previewViewers.get(eventId)?.size === 0) {
              forwardToBooth(eventId, { type: 'stop-preview-stream' })
            }
          }
        }
      }
    })
  } else if (socket.data.role === 'booth') {
    const eventId = socket.data.eventId
    logger.info(`Booth connected: ${socket.id} (event=${eventId})`)

    if (!boothSockets.has(eventId)) {
      boothSockets.set(eventId, new Set())
    }
    boothSockets.get(eventId)!.add(socket.id)
    socketEventMap.set(socket.id, eventId)

    socket.emit('authenticated', { eventId, status: 'ok' })

    notifyBoothConnected(eventId, true)

    socket.on('new-media', (data: any) => {
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('new-media', { ...data, eventId })
        }
      }
    })

    socket.on('booth-state', (data: BoothStateFull) => {
      boothStateCache.set(eventId, data)
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('booth-state', { ...data, eventId })
        }
      }
    })

    socket.on('upload-progress', (data: BoothStateFull['uploadProgress']) => {
      const existing = boothUploadCache.get(eventId) || {} as any
      boothUploadCache.set(eventId, { ...existing, ...data })
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('upload-progress', { ...data, eventId })
        }
      }
    })

    socket.on('preview-frame', (frame: Buffer) => {
      const viewers = previewViewers.get(eventId)
      if (viewers) {
        for (const sid of viewers) {
          io.to(sid).emit('preview-frame', frame)
        }
      }
    })

    socket.on('booth-config', (config: any) => {
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('booth-config', { eventId, config })
        }
      }
    })

    socket.on('booth-error', (data: { errorId: string; message: string; type: string }) => {
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('booth-error', { ...data, eventId })
        }
      }
    })

    socket.on('resolve-booth-error', (data: { errorId: string; action: string }) => {
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('booth-error-resolved', { errorId: data.errorId, action: data.action, eventId })
        }
      }
    })

    socket.on('queue-update', (data: BoothStateFull['uploadQueue']) => {
      const existing = boothUploadCache.get(eventId) || {} as any
      boothUploadCache.set(eventId, { ...existing, queue: data })
      const subs = operatorSubscriptions.get(eventId)
      if (subs) {
        for (const sid of subs) {
          io.to(sid).emit('queue-update', { ...data, eventId })
        }
      }
    })

    socket.on('disconnect', () => {
      logger.info(`Booth disconnected: ${socket.id} (event=${eventId})`)
      boothSockets.get(eventId)?.delete(socket.id)
      if (boothSockets.get(eventId)?.size === 0) {
        boothSockets.delete(eventId)
        boothStateCache.delete(eventId)
        boothUploadCache.delete(eventId)
        previewViewers.delete(eventId)
      }
      socketEventMap.delete(socket.id)
      notifyBoothConnected(eventId, false)
    })
  }
})

function forwardToBooth(eventId: string, message: any) {
  const sockets = boothSockets.get(eventId)
  if (!sockets || sockets.size === 0) return
  for (const sid of sockets) {
    io.to(sid).emit('booth-command', message)
  }
}

function notifyBoothConnected(eventId: string, connected: boolean) {
  const subs = operatorSubscriptions.get(eventId)
  if (subs) {
    for (const sid of subs) {
      io.to(sid).emit('booth-connected', { eventId, connected })
    }
  }
}

const BOOTH_TIMEOUT = 30000
function getBoothStatus() {
  return { state: 'offline', online: false }
}

app.use(errorHandler)

app.get('*', (req, res) => {
  const isApi = req.path.startsWith('/api/')
  if (isApi) {
    return res.status(404).json({ error: 'Not found' })
  }
  
  const indexPath = path.join(publicPath, 'index.html')
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      logger.error('Error reading index.html', err)
      return res.status(500).send('Internal Server Error')
    }
    
    // Inject runtime environment variables
    const envVars = {
      VITE_SHARE_BASE_URL: process.env.VITE_SHARE_BASE_URL || process.env.SHARE_BASE_URL || ''
    }
    
    const envScript = `<script>window.__env__ = ${JSON.stringify(envVars)}</script>`
    const html = data.replace('</head>', `${envScript}</head>`)
    
    res.send(html)
  })
})

server.listen(config.port, () => {
  logger.info(`snapsync server running on http://localhost:${config.port}`)
  logger.info(`Environment: ${config.nodeEnv}`)
})

function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`)
  io.close(() => {
    server.close(() => {
      logger.info('Server closed')
      process.exit(0)
    })
  })
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

export { app, server, io, boothSockets, operatorSubscriptions }
