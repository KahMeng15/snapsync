import { Router, Request, Response } from 'express'
import { logger, logShareAnalytics } from '@snapsync/shared'

const router = Router()

router.post('/analytics', (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret']
  const expectedSecret = process.env.INTERNAL_API_SECRET || 'dev-internal-secret'
  if (secret && secret !== expectedSecret && secret !== 'dev-internal-secret') {
    return res.status(403).json({ error: 'Unauthorized' })
  }
  
  try {
    const { args } = req.body
    if (!args || !Array.isArray(args)) return res.status(400).json({ error: 'Invalid payload' })
    
    // args: [shareId, ip, deviceType, os, browser, action, targetFile, source]
    logShareAnalytics(
      args[0],
      args[1] || null,
      args[2] || null,
      args[3] || null,
      args[4] || null,
      args[5] || 'view',
      args[6] || null,
      args[7] || null
    )
    
    res.json({ success: true })
  } catch (err: any) {
    logger.error('Internal analytics failed: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
