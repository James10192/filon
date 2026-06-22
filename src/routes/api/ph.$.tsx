import { createFileRoute } from '@tanstack/react-router'

/**
 * Proxy inverse PostHog (région US) — même pattern que `api/auth.$.tsx`
 * (server.handlers TanStack Start, propre à Nitro/Vercel, contrairement aux
 * rewrites `vercel.json` qui sont ignorés sous `framework: null`).
 *
 * posthog-js pointe `api_host` sur `/api/ph` : on route ici les assets
 * (`/static`, `/array`, config de remote flags) vers `us-assets.i.posthog.com`
 * et l'ingestion d'événements vers `us.i.posthog.com`. Même origine → invisible
 * aux bloqueurs de pub.
 */
const ASSET_HOST = 'https://us-assets.i.posthog.com'
const INGEST_HOST = 'https://us.i.posthog.com'

async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/ph\/?/, '')
  const isAsset = path.startsWith('static/') || path.startsWith('array/')
  const target = `${isAsset ? ASSET_HOST : INGEST_HOST}/${path}${url.search}`

  // On recopie les en-têtes mais on retire `host`/`connection` (sinon l'upstream
  // rejette la requête). Le corps est bufferisé (arrayBuffer) car undici exige
  // `duplex` pour un body en flux — cf. gotcha proxy du starter SaaS.
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('connection')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const resHeaders = new Headers(upstream.headers)
  // content-length peut diverger après re-streaming ; on laisse Nitro le poser.
  resHeaders.delete('content-length')
  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}

export const Route = createFileRoute('/api/ph/$')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => proxy(request),
      POST: ({ request }: { request: Request }) => proxy(request),
      OPTIONS: () => new Response(null, { status: 204 }),
    },
  },
})
