const DEFAULT_MAILPULSE_URL = 'http://localhost:3001'

function mailpulseBaseUrl(): string {
  return (
    import.meta.env.VITE_MAILPULSE_URL?.replace(/\/$/, '') ??
    DEFAULT_MAILPULSE_URL
  )
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

