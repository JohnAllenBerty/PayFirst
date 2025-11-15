export interface Env {
  BACKEND_ORIGIN?: string
}

// Utility: build CORS headers reflecting request origin when allowed
function buildCorsHeaders(origin: string | null) {
  const headers = new Headers()
  if (origin) headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Vary', 'Origin')
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept,Origin,Referer,User-Agent')
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

// Allow list for frontend origins
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const u = new URL(origin)
    // Allow GitHub Pages for this repo and local dev
    if (u.hostname.endsWith('github.io')) return true
    if (u.hostname === 'localhost' && (u.port === '5173' || u.port === '4173')) return true
    return false
  } catch {
    return false
  }
}

async function handleOptions(request: Request): Promise<Response> {
  // CORS preflight
  const origin = request.headers.get('Origin')
  const allowed = isAllowedOrigin(origin)
  const headers = buildCorsHeaders(allowed ? origin : '*')
  return new Response(null, { status: 204, headers })
}

async function proxy(request: Request, env: Env): Promise<Response> {
  const originHeader = request.headers.get('Origin')
  const allowed = isAllowedOrigin(originHeader)
  const corsHeaders = buildCorsHeaders(allowed ? originHeader : '*')

  const backend = env.BACKEND_ORIGIN || 'http://34.42.85.70'

  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, backend)

  // Clone headers but drop hop-by-hop
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('x-forwarded-for')
  headers.delete('x-forwarded-proto')

  const init: RequestInit = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  }

  let upstream: Response
  try {
    upstream = await fetch(target.toString(), init)
  } catch (e) {
    return new Response(JSON.stringify({ status: false, message: 'Upstream unreachable', error: String(e) }), {
      status: 502,
      headers: new Headers({ 'Content-Type': 'application/json', ...Object.fromEntries(corsHeaders) }),
    })
  }

  // Build response with CORS headers
  const respHeaders = new Headers(upstream.headers)
  corsHeaders.forEach((v, k) => respHeaders.set(k, v))

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return handleOptions(request)
    return proxy(request, env)
  },
}
