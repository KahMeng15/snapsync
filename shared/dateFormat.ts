export function parseDate(input: any): Date {
  if (!input) return new Date()
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input
  if (typeof input === 'number') return new Date(input)
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (/^\d+$/.test(trimmed)) return new Date(Number(trimmed))
    // SQLite datetime 'YYYY-MM-DD HH:MM:SS' without timezone is stored in UTC
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      return new Date(trimmed.replace(' ', 'T') + 'Z')
    }
    // Date only 'YYYY-MM-DD'
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }
  return new Date(input)
}

export function getServerTimeZone(): string {
  if (typeof process !== 'undefined' && process.env && process.env.TZ) {
    return process.env.TZ
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function formatTime(input: any, timeZone?: string): string {
  const d = parseDate(input)
  const tz = timeZone || (typeof process !== 'undefined' && process.env && process.env.TZ ? process.env.TZ : undefined)
  const opts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
  if (tz) opts.timeZone = tz
  return new Intl.DateTimeFormat('en-US', opts).format(d).toLowerCase().replace(/\s+/g, '')
}

export function formatDate(input: any, timeZone?: string): string {
  const d = parseDate(input)
  const tz = timeZone || (typeof process !== 'undefined' && process.env && process.env.TZ ? process.env.TZ : undefined)
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }
  if (tz) opts.timeZone = tz
  return new Intl.DateTimeFormat('en-GB', opts).format(d)
}

export function formatDateTime(input: any, timeZone?: string): string {
  return `${formatTime(input, timeZone)}, ${formatDate(input, timeZone)}`
}

