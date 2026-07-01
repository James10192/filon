const LOCAL_MAILPULSE_URL = 'http://localhost:3001'
const PRODUCTION_MAILPULSE_URL = 'https://mailpulse-two.vercel.app'

function mailpulseBaseUrl(): string {
  const localFilon =
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const configured = import.meta.env.VITE_MAILPULSE_URL?.trim()
  const normalized = configured ? normalizeMailPulseBaseUrl(configured) : null
  if (normalized && (localFilon || !isLocalUrl(normalized))) return normalized

  if (localFilon) {
    return LOCAL_MAILPULSE_URL
  }

  return PRODUCTION_MAILPULSE_URL
}

function normalizeMailPulseBaseUrl(value: string): string | null {
  if (value.includes('@')) return null
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    return new URL(withProtocol).origin.replace(/\/+$/, '')
  } catch {
    return null
  }
}

function isLocalUrl(value: string): boolean {
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(value).hostname)
  } catch {
    return false
  }
}

export function mailpulseSignupUrl(params?: {
  email?: string
  name?: string
}): string {
  const url = new URL('/inscription', mailpulseBaseUrl())
  url.searchParams.set('source', 'filon')
  if (params?.email) url.searchParams.set('email', params.email)
  if (params?.name) url.searchParams.set('name', params.name)
  return url.toString()
}

export function mailpulseConnectUrl(): string {
  const url = new URL('/dashboard/settings/integrations', mailpulseBaseUrl())
  url.searchParams.set('source', 'filon')
  return url.toString()
}

