import * as nodemailer from 'nodemailer'
import { resolveEmailTemplate } from '@snapsync/shared'
import { logger } from '@snapsync/shared'

export const BUILT_IN_SUBJECT = 'Hi, here are your photos from {eventName}!'
export const BUILT_IN_BODY = `Hi!

Here are your photos from {eventName}.

View and download your photos here:
{shareUrl}

{photoCount} photo(s) are waiting for you.

---
Sent via SnapSync`

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export function getSmtpInfo(): { host: string; port: number; secure: boolean; fromAddress: string } | null {
  if (!isSmtpConfigured()) return null
  return {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    fromAddress: process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER!
  }
}

let cachedTransport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000
  })
  
  return cachedTransport
}

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    // Replace all occurrences of {key}
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }
  return result
}

export interface ResolvedEmailTemplate {
  subject: string
  body: string
  fromName: string
}

export function resolveEmailContent(event: any, globals: any): ResolvedEmailTemplate {
  return {
    subject: resolveEmailTemplate(event, globals, 'email_subject') || BUILT_IN_SUBJECT,
    body: resolveEmailTemplate(event, globals, 'email_body') || BUILT_IN_BODY,
    fromName: resolveEmailTemplate(event, globals, 'email_from_name') || process.env.SMTP_FROM_NAME || 'SnapSync Photo Booth'
  }
}

export interface SendEmailResult {
  success: boolean
  sentAt?: string
  errorCode?: string
  errorMessage?: string
}

export async function sendShareEmail(opts: {
  to: string
  subject: string
  body: string
  fromName: string
}): Promise<SendEmailResult> {
  if (!isSmtpConfigured()) {
    return { success: false, errorCode: 'not_configured', errorMessage: 'Email is not configured on this server. Contact your administrator.' }
  }

  const transport = getTransport()
  const fromAddress = process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER!

  try {
    await transport.sendMail({
      from: `"${opts.fromName}" <${fromAddress}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.body
    })
    
    return { success: true, sentAt: new Date().toISOString() }
  } catch (error: any) {
    logger.error('Failed to send email:', error)
    
    let errorCode = 'smtp_error'
    let errorMessage = 'Failed to send email: ' + (error.message || 'Unknown error')

    if (error.code === 'EENVELOPE' || (error.responseCode >= 550 && error.responseCode <= 553 && error.command === 'RCPT TO')) {
      errorCode = 'invalid_email'
      errorMessage = 'The email address appears to be invalid or does not exist.'
    } else if (error.responseCode === 421 || error.responseCode === 450) {
      errorCode = 'rate_limit'
      errorMessage = 'Too many emails sent recently. Please wait a moment and try again.'
    } else if (error.responseCode === 535) {
      errorCode = 'auth_failed'
      errorMessage = 'Email server authentication failed. Contact your administrator.'
      cachedTransport = null // clear cache on auth failure
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      errorCode = 'connection_error'
      errorMessage = 'Could not connect to the email server. Check network or SMTP settings.'
    } else if (error.responseCode === 552) {
      errorCode = 'quota_exceeded'
      errorMessage = 'Email quota exceeded. Try again later.'
    }
    
    return { success: false, errorCode, errorMessage }
  }
}
