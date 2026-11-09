import dotenv from 'dotenv'
dotenv.config({ path: '../.env' }) // Fallback to root .env if running locally

import express from 'express'
import http from 'http'
import compression from 'compression'
import helmet from 'helmet'
import cors from 'cors'
import path from 'path'
import fs from 'fs'

import { config, logger, shareRateLimiter } from '@snapsync/shared'
import shareRoutes from './routes/share'

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
app.use(express.json())

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}
app.use(cors(corsOptions))
app.use(shareRateLimiter as any)

const basePath = '/snapsync'

app.use(`${basePath}/api/share`, shareRateLimiter as any, shareRoutes as any)

// Resolve path to docs/index.html
function getDocsPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'docs/index.html'),
    path.resolve(__dirname, '../docs/index.html'),
    path.resolve(__dirname, '../../docs/index.html'),
    path.resolve(__dirname, '../../../docs/index.html'),
    path.resolve(process.cwd(), '../docs/index.html'),
    path.resolve('/app/docs/index.html'),
    path.resolve('/docs/index.html'),
  ]
  return candidates.find(p => fs.existsSync(p)) || path.resolve(process.cwd(), 'docs/index.html')
}

// Redirect root / to /snapsync/
app.get('/', (req, res) => {
  res.redirect(`${basePath}/`)
})

// Redirect /snapsync/share and /snapsync/share/ to /snapsync/
app.get([`${basePath}/share`, `${basePath}/share/`], (req, res) => {
  res.redirect(`${basePath}/`)
})

// Serve documentation / landing page at /snapsync and /snapsync/
app.get([basePath, `${basePath}/`], (req, res) => {
  res.sendFile(getDocsPath())
})

const publicPath = [
  path.join(process.cwd(), 'public'),
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
].find(p => fs.existsSync(p)) || path.join(process.cwd(), 'public')

app.use(`${basePath}/share`, express.static(publicPath, { index: false }))

app.get(`${basePath}/share/*`, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'))
})

const port = 3001
const server = http.createServer(app)

server.listen(port, () => {
  logger.info(`Share server listening on port ${port}`)
})
