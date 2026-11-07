export function parseDate(input: any): Date {
  if (!input) return new Date()
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input
  if (typeof input === 'number') return new Date(input)
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (/^\d+$/.test(trimmed)) return new Date(Number(trimmed))
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      return new Date(trimmed.replace(' ', 'T') + 'Z')
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }
  return new Date(input)
}

export function formatTime(input: any, timeZone?: string): string {
  const d = parseDate(input)
  const opts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
  if (timeZone) opts.timeZone = timeZone
  return new Intl.DateTimeFormat('en-US', opts).format(d).toLowerCase().replace(/\s+/g, '')
}

export function formatDate(input: any, timeZone?: string): string {
  const d = parseDate(input)
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }
  if (timeZone) opts.timeZone = timeZone
  return new Intl.DateTimeFormat('en-GB', opts).format(d)
}

export function formatDateTime(input: any, timeZone?: string): string {
  return `${formatTime(input, timeZone)}, ${formatDate(input, timeZone)}`
}

