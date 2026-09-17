router.post('/email-session', async (req: Request, res: Response) => {
  if (checkOtpRateLimit(req, res)) return

  const { sessionId, recipientEmail } = req.body
  const otp = req.headers['x-booth-otp'] as string

  if (!otp) {
    recordFailedOtpAttempt(req)
    return res.status(400).json({ error: 'OTP required' })
  }
  const event = getEventByOtp(otp)
  if (!event) {
    recordFailedOtpAttempt(req)
    return res.status(404).json({ error: 'Event not found for OTP' })
  }
  if (event.email_enabled === 0) return res.status(403).json({ error: 'Email is disabled for this event' })

  if (!isSmtpConfigured()) {
    return res.status(503).json({ error: 'Email is not configured on this server' })
  }

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const emails = getEmailSendsBySession(sessionId)
  if (emails.length >= 20) {
    return res.status(429).json({ error: 'Too many emails for this session' })
  }

  let shareId: string | null = null
  const existingFailed = emails.find(e => e.recipient_email === recipientEmail && e.status === 'failed')
  if (existingFailed) {
    shareId = existingFailed.share_id
  } else {
    const shares = getSessionShares(sessionId)
    const primaryShare = shares.find(s => s.is_active === 1)
    if (primaryShare) {
      shareId = primaryShare.id
    } else {
      shareId = createSessionShare(sessionId)
    }
  }

  const globalDefaults = getGlobalEmailDefaults()
  const template = resolveEmailContent(event, globalDefaults)

  const baseUrl = process.env.VITE_SHARE_BASE_URL || (process.env.SHARE_BASE_URL ? `${process.env.SHARE_BASE_URL.replace(/\/$/, '')}/share` : `${req.protocol}://${req.get('host')}/share`);
  const shareUrl = `${baseUrl.replace(/\/$/, '')}/${shareId}`

  const eventDateObj = new Date(event.created_at || Date.now())
  const eventDate = eventDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const eventTime = eventDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  const renderedBody = renderTemplate(template.body, {
    shareUrl,
    eventName: event.name,
    photoCount: event.photo_count,
    organizer: event.organizer || '',
    contactInfo: event.contact_info || '',
    eventDate,
    eventTime,
    shareTitle: ''
  })

  const renderedSubject = renderTemplate(template.subject, {
    eventName: event.name,
    photoCount: event.photo_count,
    organizer: event.organizer || '',
    eventDate,
    eventTime
  })

  const emailSendId = createEmailSend({
    sessionId,
    eventId: event.id,
    shareId: shareId!,
    recipientEmail,
    sentByName: 'Booth Guest'
  })

  try {
    const result = await sendShareEmail({
      to: recipientEmail,
      subject: renderedSubject,
      body: renderedBody,
      fromName: template.fromName
    })

    updateEmailSendStatus(emailSendId, result.success ? 'sent' : 'failed', {
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      sentAt: result.sentAt
    })

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.errorMessage })
    }

    res.json({ success: true })
  } catch (err: any) {
    logger.error('Error in booth email route', err)
    res.status(500).json({ error: err.message })
  }
})
