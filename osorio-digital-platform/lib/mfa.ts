import {
  generateSecret,
  generateSync,
  verifySync,
  generateURI,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'

// Plugins necessários no otplib v13
const PLUGINS = {
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
}

const TOTP_OPTS = {
  ...PLUGINS,
  step:   30,
  window: 1,
}

const APP_NAME = 'Osorio Digital'

export function generateMfaSecret(): string {
  return generateSecret()
}

export function generateOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    label:  email,
    issuer: APP_NAME,
    secret,
    ...PLUGINS,
  })
}

export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    width:  256,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })
}

export function verifyMfaCode(code: string, secret: string): boolean {
  try {
    const result = verifySync({ ...TOTP_OPTS, token: code, secret })
    return result.valid
  } catch {
    return false
  }
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase()
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase()
    return `${part1}-${part2}`
  })
}

export function hashBackupCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase().replace(/-/g, ''))
    .digest('hex')
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function parseDeviceName(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  let browser = 'Navegador'
  if (ua.includes('edg/'))     browser = 'Edge'
  else if (ua.includes('chrome'))  browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari'))  browser = 'Safari'

  let os = 'Desconhecido'
  if (ua.includes('windows'))      os = 'Windows'
  else if (ua.includes('iphone'))  os = 'iPhone'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('mac'))     os = 'macOS'
  else if (ua.includes('linux'))   os = 'Linux'

  return `${browser} em ${os}`
}

// Gera um código TOTP para um segredo (usado em testes)
export function generateTotpCode(secret: string): string {
  return generateSync({ ...TOTP_OPTS, secret })
}
