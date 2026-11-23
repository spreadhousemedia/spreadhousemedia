import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, 'dist')

// Load .env from project root into process.env (server-side only; never exposed to browser)
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

loadEnvFile()

const PORT = Number(process.env.PORT || 3000)
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || 'https://spreadnfc.in').trim().replace(/\/$/, '')
const PORTAL_BASE_PATH = (() => {
  const raw = (process.env.PORTAL_PATH || process.env.VITE_PORTAL_PATH || '').trim().replace(/^\/+|\/+$/g, '')
  return raw ? `/${raw}` : '/s-vault-9x4m'
})()

const ADMIN_COOKIE_NAME = 'spreadnfc_admin_session'

// In-memory ultra-fast QR redirect cache (30s TTL, invalidated immediately on mutations)
const REDIRECT_CACHE = new Map()
const REDIRECT_CACHE_TTL_MS = 30_000

const PUBLIC_RPCS = new Set([
  'get_qr_redirect',
  'request_qr_update',
  'verify_setup_code',
  'customer_claim_qr',
  'customer_login_qr',
  'customer_get_dashboard',
  'customer_select_usage_mode',
  'customer_save_personal_profile',
  'customer_save_business_profile',
  'customer_save_business_settings',
  'customer_change_password',
  'check_public_slug_available',
  'get_public_profile',
  'customer_get_multi_qr_summary',
  'confirm_qr_update',
  'track_support_ticket',
  'create_public_order',
  'create_public_support_ticket',
  'create_public_inquiry',
  'get_public_products',
])

const ADMIN_RPCS = new Set([
  'admin_create_single_qr',
  'admin_create_batch',
  'admin_process_qr_csv',
  'admin_reset_qr_password',
  'admin_reset_qr_unclaimed',
  'admin_set_qr_usage_type',
  'export_full_database_snapshot',
  'is_admin',
])

const CACHE_INVALIDATING_RPCS = new Set([
  'customer_save_personal_profile',
  'customer_save_business_profile',
  'customer_save_business_settings',
  'customer_select_usage_mode',
  'confirm_qr_update',
  'admin_set_qr_usage_type',
  'admin_reset_qr_unclaimed',
])

const ALLOWED_TABLES = new Set([
  'qr_codes',
  'batches',
  'qr_profiles',
  'qr_links',
  'products',
  'orders',
  'support_tickets',
  'contact_inquiries',
])

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const KNOWN_PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/products',
  '/support',
  '/contact',
  '/update',
  '/privacy',
  '/terms',
  '/login',
])

function isKnownAppRoute(pathname) {
  if (KNOWN_PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith('/p/')) return pathname.length > 3
  if (pathname.startsWith('/q/')) return pathname.length > 3
  if (pathname === PORTAL_BASE_PATH || pathname.startsWith(`${PORTAL_BASE_PATH}/`)) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  return false
}

function isSafeHttpUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.length > 2048) return false
  const trimmed = urlStr.trim()
  if (/^\s*(javascript|data|file|vbscript|about|blob|ftp|mailto|tel|sms):/i.test(trimmed)) return false
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    try {
      out[k] = decodeURIComponent(v)
    } catch {
      out[k] = v
    }
  }
  return out
}

function isHttpsRequest(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase()
  return proto === 'https' || APP_BASE_URL.startsWith('https://')
}

function setAdminCookie(res, req, token, maxAgeSec = 86400) {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
  ]
  if (isHttpsRequest(req) && !String(req.headers.host || '').includes('localhost')) {
    parts.push('Secure')
  }
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearAdminCookie(res, req) {
  setAdminCookie(res, req, '', 0)
}

async function readJsonBody(req, maxBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('payload_too_large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid_json'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...securityHeaders(),
    ...extraHeaders,
  })
  res.end(body)
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  }
}

function ensureSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

async function supabaseFetch(endpoint, { method = 'GET', headers = {}, body = undefined, bearer = null } = {}) {
  if (!ensureSupabaseConfigured()) {
    throw new Error('supabase_not_configured')
  }
  const authToken = bearer || SUPABASE_ANON_KEY
  const res = await fetch(`${SUPABASE_URL}${endpoint}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  })
  const text = await res.text()
  let parsed = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }
  return { ok: res.ok, status: res.status, data: parsed, headers: res.headers }
}

async function verifyAdminJwt(jwt) {
  if (!jwt) return null
  try {
    const userRes = await supabaseFetch('/auth/v1/user', { bearer: jwt })
    if (!userRes.ok || !userRes.data?.id) return null
    const adminRes = await supabaseFetch('/rest/v1/rpc/is_admin', {
      method: 'POST',
      bearer: jwt,
      body: {},
    })
    if (!adminRes.ok || adminRes.data !== true) return null
    return userRes.data
  } catch {
    return null
  }
}

function getMarkdownForRoute(pathname) {
  const pages = {
    '/': `# Spread NFC — Smart Dynamic QR & NFC Business Cards

> Print your QR or NFC card once. Update destination links, Google Reviews, or multi-link digital profiles anytime in under 30 seconds at https://spreadnfc.in.

## Overview
Spread NFC provides durable NFC business cards (Matte PVC, Brushed Metal, Eco Bamboo), contactless acrylic standees, and epoxy tags powered by a server-verified dynamic redirection platform.

## Key Capabilities
- **Personal Digital Profiles**: Share social icons, custom links, curated avatars, and light/dark themes.
- **Business Direct Link**: Instant HTTP 302 redirect to Google Reviews, menus, payment links, or websites.
- **Business Profile**: Multi-link storefront with category, location, Google Reviews, Google Maps, WhatsApp, and contact info.
- **Multi-QR Management**: Manage multiple authenticated QR codes in one workspace.

## Navigation
- [About Spread NFC](https://spreadnfc.in/about)
- [Products & Pricing](https://spreadnfc.in/products)
- [Update Card & QR Portal](https://spreadnfc.in/update)
- [Support Helpdesk](https://spreadnfc.in/support)
- [Contact & Enterprise Orders](https://spreadnfc.in/contact)
- [Privacy Policy](https://spreadnfc.in/privacy)
- [Terms of Service](https://spreadnfc.in/terms)

## Contact
- Email: [contact@spreadnfc.in](mailto:contact@spreadnfc.in)
- Phone / WhatsApp: [+91 93510 42276](tel:+919351042276)
`,
    '/about': `# About Spread NFC

> Permanent NFC hardware and dynamic QR infrastructure built by ETROMO for creators and businesses.

- Founder: Aditya
- Email: contact@spreadnfc.in
- Phone: +91 93510 42276
- Partner Studio: https://etromo.in
`,
    '/products': `# Spread NFC Products & Pricing

- **Spread NFC Matte PVC Smart Card**: Rs. 499 (NTAG216, waterproof polymer)
- **Spread NFC Luxury Stainless Steel Card**: Rs. 1,299 (laser-engraved 304 steel)
- **Spread NFC Natural Eco Bamboo Card**: Rs. 799 (biodegradable bamboo core)
- **Spread NFC Contactless Tabletop Standee**: Rs. 899 (acrylic counter stand for Google Reviews & menus)
- **Spread NFC Epoxy Mini Smart Tag**: Rs. 349 (3M adhesive phone tag)

Bulk discounts: 15% off (5+), 25% off (20+), 35% off (50+).
`,
    '/contact': `# Contact Spread NFC

- Sales & Support Email: contact@spreadnfc.in
- Phone / WhatsApp: +91 93510 42276
- Hours: Monday - Saturday, 9:30 AM - 6:30 PM IST
`,
    '/support': `# Spread NFC Support Helpdesk

Submit or track NFC hardware, QR redirection, and order status tickets at https://spreadnfc.in/support or email contact@spreadnfc.in.
`,
    '/update': `# Spread NFC Card & QR Update Portal

Activate new cards with your packaging setup code, choose Personal Profile, Business Direct Link, or Business Profile, or sign in to update links anytime at https://spreadnfc.in/update.
`,
    '/privacy': `# Privacy Policy — Spread NFC

Customer passwords and setup codes are bcrypt-hashed server-side. Personal emails are never shown on public profiles. Contact contact@spreadnfc.in for data requests.
`,
    '/terms': `# Terms of Service — Spread NFC

Spread NFC permits only safe public HTTP/HTTPS destinations and blocks malicious or private-network redirects. Support: contact@spreadnfc.in.
`,
  }
  return pages[pathname] || null
}

async function handleFastQrRedirect(req, res, rawQr) {
  const normQr = decodeURIComponent(rawQr || '').trim().toUpperCase()
  if (!normQr || !/^[A-Za-z0-9_-]{1,64}$/.test(normQr)) {
    res.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      ...securityHeaders(),
    })
    res.end('QR code not found')
    return
  }

  const cached = REDIRECT_CACHE.get(normQr)
  let row = null

  if (cached && cached.expiresAt > Date.now()) {
    row = cached.row
    // Non-blocking scan count increment in background without delaying HTTP 302
    if (ensureSupabaseConfigured()) {
      supabaseFetch('/rest/v1/rpc/get_qr_redirect', {
        method: 'POST',
        body: { p_qr_number: normQr },
      }).catch(() => {})
    }
  } else if (ensureSupabaseConfigured()) {
    try {
      const rpcRes = await supabaseFetch('/rest/v1/rpc/get_qr_redirect', {
        method: 'POST',
        body: { p_qr_number: normQr },
      })
      if (rpcRes.ok && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
        row = rpcRes.data[0]
        REDIRECT_CACHE.set(normQr, { row, expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS })
      }
    } catch {
      // Fall back to SPA if upstream temporarily unreachable
    }
  }

  if (row) {
    if (row.status !== 'active') {
      res.writeHead(302, {
        Location: `/update?qr=${encodeURIComponent(normQr)}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex',
        ...securityHeaders(),
      })
      res.end()
      return
    }

    if (row.usage_type === 'personal' || row.usage_type === 'business_profile') {
      const identifier = row.public_slug || normQr
      res.writeHead(302, {
        Location: `/p/${encodeURIComponent(identifier)}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex',
        ...securityHeaders(),
      })
      res.end()
      return
    }

    if (row.destination_url && isSafeHttpUrl(row.destination_url)) {
      res.writeHead(302, {
        Location: row.destination_url.trim(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex',
        ...securityHeaders(),
      })
      res.end()
      return
    }

    res.writeHead(302, {
      Location: `/update?qr=${encodeURIComponent(normQr)}`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex',
      ...securityHeaders(),
    })
    res.end()
    return
  }

  // Fallback to SPA HTML if Supabase is unreachable or unconfigured
  serveSpaHtml(req, res, 200, `/q/${encodeURIComponent(normQr)}`)
}

let cachedIndexHtml = null
function readIndexHtml() {
  if (cachedIndexHtml && process.env.NODE_ENV === 'production') return cachedIndexHtml
  const prodIndex = path.join(DIST_DIR, 'index.html')
  const rootIndex = path.join(__dirname, 'index.html')
  const filePath = fs.existsSync(prodIndex) ? prodIndex : rootIndex
  cachedIndexHtml = fs.readFileSync(filePath, 'utf8')
  return cachedIndexHtml
}

function serveSpaHtml(req, res, statusCode, pathname) {
  let html = readIndexHtml()
  const canonicalUrl = `${APP_BASE_URL}${pathname === '/' ? '/' : pathname}`
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  )
  if (statusCode === 404) {
    html = html.replace(
      '</head>',
      '  <meta name="robots" content="noindex, nofollow" />\n  </head>',
    )
  }

  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Vary: 'Accept',
    ...securityHeaders(),
  }

  if (statusCode === 200 && (pathname === '/' || KNOWN_PUBLIC_PATHS.has(pathname))) {
    headers.Link = '</llms.txt>; rel="alternate"; type="text/plain"; title="LLM Context", </index.md>; rel="alternate"; type="text/markdown"; title="Markdown"'
  }

  res.writeHead(statusCode, headers)
  res.end(html)
}

function serveStaticAsset(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')
  const distCandidate = path.join(DIST_DIR, safePath)
  const publicCandidate = path.join(__dirname, 'public', safePath)
  const candidate =
    distCandidate.startsWith(DIST_DIR) && fs.existsSync(distCandidate)
      ? distCandidate
      : publicCandidate.startsWith(path.join(__dirname, 'public')) && fs.existsSync(publicCandidate)
        ? publicCandidate
        : null
  if (!candidate) {
    return false
  }
  const stat = fs.statSync(candidate)
  if (!stat.isFile()) return false

  // Block hidden dotfiles except .well-known
  const baseName = path.basename(candidate)
  if (baseName.startsWith('.') && !pathname.startsWith('/.well-known/')) {
    return false
  }

  const ext = path.extname(candidate).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'
  const isImmutable = pathname.startsWith('/assets/')
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': isImmutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    ...securityHeaders(),
  })
  fs.createReadStream(candidate).pipe(res)
  return true
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = reqUrl.pathname
  const method = (req.method || 'GET').toUpperCase()

  try {
    // 1. Ultra-Fast Server-Side QR Redirect
    if (method === 'GET' && pathname.startsWith('/q/')) {
      const qrPart = pathname.slice(3).split('/')[0]
      await handleFastQrRedirect(req, res, qrPart)
      return
    }

    // 1.5 Health check (exposes no credentials)
    if (pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        runtime: 'node',
        supabaseConfigured: ensureSupabaseConfigured(),
      })
      return
    }

    // 2. Auth API (HttpOnly Admin Session Cookie)
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readJsonBody(req)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      if (!email || !password) {
        sendJson(res, 400, { ok: false, error: 'Email and password are required.' })
        return
      }
      const authRes = await supabaseFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email, password },
      })
      if (!authRes.ok || !authRes.data?.access_token) {
        sendJson(res, 401, { ok: false, error: authRes.data?.error_description || 'Invalid email or password.' })
        return
      }
      const jwt = authRes.data.access_token
      const adminUser = await verifyAdminJwt(jwt)
      if (!adminUser) {
        sendJson(res, 403, { ok: false, error: 'Access denied. Account is not in the admin allowlist.' })
        return
      }
      setAdminCookie(res, req, jwt, Number(authRes.data.expires_in || 86400))
      sendJson(res, 200, {
        ok: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          user_metadata: adminUser.user_metadata || {},
        },
      })
      return
    }

    if (pathname === '/api/auth/session' && method === 'GET') {
      const cookies = parseCookies(req)
      const jwt = cookies[ADMIN_COOKIE_NAME]
      const adminUser = await verifyAdminJwt(jwt)
      if (!adminUser) {
        if (jwt) clearAdminCookie(res, req)
        sendJson(res, 200, { authenticated: false, user: null })
        return
      }
      sendJson(res, 200, {
        authenticated: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          user_metadata: adminUser.user_metadata || {},
        },
      })
      return
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const cookies = parseCookies(req)
      const jwt = cookies[ADMIN_COOKIE_NAME]
      if (jwt && ensureSupabaseConfigured()) {
        supabaseFetch('/auth/v1/logout', { method: 'POST', bearer: jwt }).catch(() => {})
      }
      clearAdminCookie(res, req)
      sendJson(res, 200, { ok: true })
      return
    }

    if (pathname === '/api/auth/change-password' && method === 'POST') {
      const cookies = parseCookies(req)
      const jwt = cookies[ADMIN_COOKIE_NAME]
      const adminUser = await verifyAdminJwt(jwt)
      if (!adminUser) {
        sendJson(res, 401, { ok: false, error: 'Unauthorized' })
        return
      }
      const body = await readJsonBody(req)
      const newPassword = String(body.password || '')
      if (newPassword.length < 8) {
        sendJson(res, 400, { ok: false, error: 'Password must be at least 8 characters.' })
        return
      }
      const updateRes = await supabaseFetch('/auth/v1/user', {
        method: 'PUT',
        bearer: jwt,
        body: { password: newPassword },
      })
      if (!updateRes.ok) {
        sendJson(res, 400, { ok: false, error: updateRes.data?.msg || 'Failed to update password.' })
        return
      }
      sendJson(res, 200, { ok: true })
      return
    }

    // 3. Server-Side RPC Proxy (Allowlisted + Admin-Gated)
    if (pathname.startsWith('/api/rpc/') && method === 'POST') {
      const fnName = pathname.slice('/api/rpc/'.length).trim()
      const isPublic = PUBLIC_RPCS.has(fnName)
      const isAdminFn = ADMIN_RPCS.has(fnName)
      if (!isPublic && !isAdminFn) {
        sendJson(res, 404, { data: null, error: { message: 'Unknown RPC endpoint' } })
        return
      }

      let bearer = null
      if (isAdminFn) {
        const cookies = parseCookies(req)
        const jwt = cookies[ADMIN_COOKIE_NAME]
        const adminUser = await verifyAdminJwt(jwt)
        if (!adminUser) {
          sendJson(res, 401, { data: null, error: { message: 'unauthorized' } })
          return
        }
        bearer = jwt
      }

      const params = await readJsonBody(req)
      const rpcRes = await supabaseFetch(`/rest/v1/rpc/${encodeURIComponent(fnName)}`, {
        method: 'POST',
        bearer,
        body: params,
      })

      if (CACHE_INVALIDATING_RPCS.has(fnName)) {
        const maybeQr = params?.p_qr_number || rpcRes.data?.qr_number
        if (typeof maybeQr === 'string' && maybeQr.trim()) {
          REDIRECT_CACHE.delete(maybeQr.trim().toUpperCase())
        } else {
          REDIRECT_CACHE.clear()
        }
      }

      if (!rpcRes.ok) {
        sendJson(res, rpcRes.status, {
          data: null,
          error: { message: rpcRes.data?.message || 'Database RPC error' },
        })
        return
      }

      sendJson(res, 200, { data: rpcRes.data, error: null })
      return
    }

    // 4. Server-Side PostgREST Table Proxy (Strictly Admin-Gated except public active products)
    if (pathname === '/api/db' && method === 'POST') {
      const body = await readJsonBody(req)
      const table = String(body.table || '')
      const action = String(body.action || 'select')
      if (!ALLOWED_TABLES.has(table)) {
        sendJson(res, 403, { data: null, count: null, error: { message: 'Forbidden table' } })
        return
      }

      const isPublicProductSelect = table === 'products' && action === 'select'
      let bearer = null
      if (!isPublicProductSelect) {
        const cookies = parseCookies(req)
        const jwt = cookies[ADMIN_COOKIE_NAME]
        const adminUser = await verifyAdminJwt(jwt)
        if (!adminUser) {
          sendJson(res, 401, { data: null, count: null, error: { message: 'unauthorized' } })
          return
        }
        bearer = jwt
      }

      const qs = new URLSearchParams()
      if (action === 'select') {
        const rawCols = String(body.columns || '*')
        // Never allow selecting password_hash or setup_code_hash even for admin
        const safeCols =
          table === 'qr_codes' &&
          (rawCols.includes('*') || rawCols.includes('password_hash') || rawCols.includes('setup_code_hash'))
            ? 'id, qr_number, qr_name, destination_url, status, batch_id, password_changed, claimed_at, owner_email, usage_type, business_name, business_purpose, scan_count, created_at, updated_at'
            : rawCols
        qs.set('select', safeCols)
      }

      if (action === 'upsert' && typeof body.onConflict === 'string' && /^[a-zA-Z0-9_,]+$/.test(body.onConflict)) {
        qs.set('on_conflict', body.onConflict)
      }

      const filters = Array.isArray(body.filters) ? body.filters : []
      for (const f of filters) {
        if (!f || typeof f.op !== 'string') continue
        if (f.op === 'or' && typeof f.value === 'string') {
          qs.set('or', `(${f.value})`)
        } else if (typeof f.column === 'string') {
          const col = f.column
          if (col === 'password_hash' || col === 'setup_code_hash') continue
          if (f.op === 'eq') qs.append(col, `eq.${f.value}`)
          else if (f.op === 'neq') qs.append(col, `neq.${f.value}`)
          else if (f.op === 'is') qs.append(col, `is.${f.value}`)
          else if (f.op === 'not') qs.append(col, `not.${f.operator}.${f.value}`)
          else if (f.op === 'in' && Array.isArray(f.values)) {
            qs.append(col, `in.(${f.values.join(',')})`)
          }
        }
      }

      if (isPublicProductSelect && !bearer) {
        qs.set('is_active', 'eq.true')
      }

      if (body.order && typeof body.order.column === 'string') {
        qs.set('order', `${body.order.column}.${body.order.ascending ? 'asc' : 'desc'}`)
      }
      if (typeof body.limit === 'number' && body.limit > 0) {
        const maxLimit = !bearer ? 200 : 5000
        qs.set('limit', String(Math.min(body.limit, maxLimit)))
      }

      const extraHeaders = {}
      const preferParts = []
      if (body.count === 'exact') preferParts.push('count=exact')
      if (action === 'insert' || action === 'update' || action === 'upsert') {
        preferParts.push('return=representation')
      }
      if (action === 'upsert') {
        preferParts.push('resolution=merge-duplicates')
      }
      if (preferParts.length > 0) extraHeaders.Prefer = preferParts.join(',')
      if (body.range && typeof body.range.from === 'number' && typeof body.range.to === 'number') {
        extraHeaders.Range = `${body.range.from}-${body.range.to}`
      }

      let httpMethod = 'GET'
      let reqBody = undefined
      if (action === 'select' && body.head) httpMethod = 'HEAD'
      else if (action === 'insert' || action === 'upsert') {
        httpMethod = 'POST'
        reqBody = body.payload
      } else if (action === 'update') {
        httpMethod = 'PATCH'
        reqBody = body.payload
      } else if (action === 'delete') {
        httpMethod = 'DELETE'
      }

      const pgRes = await supabaseFetch(`/rest/v1/${table}?${qs.toString()}`, {
        method: httpMethod,
        headers: extraHeaders,
        body: reqBody,
        bearer,
      })

      if ((action === 'update' || action === 'upsert' || action === 'delete') && (table === 'qr_codes' || table === 'qr_profiles')) {
        REDIRECT_CACHE.clear()
      }

      let count = null
      const contentRange = pgRes.headers.get('content-range')
      if (contentRange) {
        const slashIdx = contentRange.indexOf('/')
        if (slashIdx !== -1) {
          const totalPart = Number(contentRange.slice(slashIdx + 1))
          if (!Number.isNaN(totalPart)) count = totalPart
        }
      }

      if (!pgRes.ok) {
        sendJson(res, pgRes.status, {
          data: null,
          count,
          error: { message: pgRes.data?.message || 'Database query failed' },
        })
        return
      }

      sendJson(res, 200, { data: body.head ? null : pgRes.data, count, error: null })
      return
    }

    // 5. MCP JSON-RPC Endpoint (matches /.well-known/mcp/server-card.json)
    if (pathname === '/api/mcp' && method === 'POST') {
      const rpc = await readJsonBody(req)
      const id = rpc.id ?? null
      if (rpc.method === 'initialize') {
        sendJson(res, 200, {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-06-18',
            serverInfo: { name: 'spreadnfc-mcp', version: '1.0.0' },
            capabilities: { tools: { listChanged: false } },
          },
        })
        return
      }
      if (rpc.method === 'tools/list') {
        const card = fs.readFileSync(path.join(DIST_DIR, '.well-known/mcp/server-card.json'), 'utf8')
        const parsed = JSON.parse(card)
        sendJson(res, 200, { jsonrpc: '2.0', id, result: { tools: parsed.tools || [] } })
        return
      }
      if (rpc.method === 'tools/call') {
        const toolName = rpc.params?.name
        const args = rpc.params?.arguments || {}
        if (toolName === 'list_nfc_products') {
          const prodRes = await supabaseFetch('/rest/v1/rpc/get_public_products', {
            method: 'POST',
            body: { p_category: args.category || null },
          })
          sendJson(res, 200, {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(prodRes.data) }] },
          })
          return
        }
        if (toolName === 'lookup_qr_status') {
          const qrRes = await supabaseFetch('/rest/v1/rpc/request_qr_update', {
            method: 'POST',
            body: { p_qr_number: String(args.qr_number || '').trim().toUpperCase() },
          })
          sendJson(res, 200, {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(qrRes.data) }] },
          })
          return
        }
        if (toolName === 'get_public_profile') {
          const profRes = await supabaseFetch('/rest/v1/rpc/get_public_profile', {
            method: 'POST',
            body: { p_identifier: String(args.identifier || '').trim() },
          })
          sendJson(res, 200, {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(profRes.data) }] },
          })
          return
        }
      }
      sendJson(res, 400, { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } })
      return
    }

    // 6. Agent-Ready Markdown Representation (Accept: text/markdown or /index.md)
    if (method === 'GET' || method === 'HEAD') {
      const acceptHeader = String(req.headers.accept || '').toLowerCase()
      if (pathname === '/index.md' || acceptHeader.includes('text/markdown')) {
        const targetPath = pathname === '/index.md' ? '/' : pathname
        const md = getMarkdownForRoute(targetPath)
        if (md) {
          res.writeHead(200, {
            'Content-Type': 'text/markdown; charset=utf-8',
            Vary: 'Accept',
            Link: '</llms.txt>; rel="alternate"; type="text/plain"; title="LLM Context", </index.md>; rel="alternate"; type="text/markdown"; title="Markdown"',
            ...securityHeaders(),
          })
          res.end(method === 'HEAD' ? undefined : md)
          return
        }
      }

      // 7. Static files in dist/ (includes robots.txt, llms.txt, .well-known/mcp/server-card.json, assets/*)
      if (pathname !== '/' && serveStaticAsset(req, res, pathname)) {
        return
      }

      // 8. SPA routes vs Real HTTP 404 for unknown routes
      if (isKnownAppRoute(pathname)) {
        serveSpaHtml(req, res, 200, pathname)
        return
      }

      serveSpaHtml(req, res, 404, pathname)
      return
    }

    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders() })
    res.end('Method Not Allowed')
  } catch (err) {
    const isMissingConfig = err?.message === 'supabase_not_configured'
    const code = err?.message === 'payload_too_large' ? 413 : isMissingConfig ? 503 : 500
    const message = isMissingConfig
      ? 'Server database environment variables (SUPABASE_URL / SUPABASE_ANON_KEY) are not configured.'
      : err?.message || 'Internal server error'
    sendJson(res, code, { ok: false, data: null, error: { message } })
  }
})

server.listen(PORT, () => {
  console.log(`SpreadNFC production server listening on port ${PORT}`)
})

