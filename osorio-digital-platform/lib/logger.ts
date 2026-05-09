const SENSITIVE = new Set([
  'password', 'passwd', 'pwd', 'token', 'secret', 'key',
  'authorization', 'cookie', 'credential', 'auth', 'apikey',
])

function isSensitive(key: string) {
  const lower = key.toLowerCase()
  return SENSITIVE.has(lower) || [...SENSITIVE].some((s) => lower.includes(s))
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitive(k) ? '[REDACTED]' : sanitize(v, depth + 1)
  }
  return out
}

function entry(level: string, message: string, meta?: unknown) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta: sanitize(meta) } : {}),
  })
}

const isProd = process.env.NODE_ENV === 'production'

export const logger = {
  info:  (msg: string, meta?: unknown) => console.info(entry('info',  msg, meta)),
  warn:  (msg: string, meta?: unknown) => console.warn(entry('warn',  msg, meta)),
  error: (msg: string, meta?: unknown) => console.error(entry('error', msg, meta)),
  debug: (msg: string, meta?: unknown) => { if (!isProd) console.debug(entry('debug', msg, meta)) },
}
