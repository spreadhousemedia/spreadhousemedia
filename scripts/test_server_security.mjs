import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const PORT = 3456
const BASE = `http://127.0.0.1:${PORT}`

// 1. Verify zero Supabase URLs or JWT keys leaked into compiled frontend assets
const assetsDir = join(process.cwd(), 'dist', 'assets')
const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
for (const file of jsFiles) {
  const content = readFileSync(join(assetsDir, file), 'utf8')
  assert.equal(content.includes('dvuuturphjumffqyigtz'), false, `Leaked Supabase project ID in ${file}`)
  assert.equal(content.includes('eyJhbGci'), false, `Leaked JWT key in ${file}`)
  assert.equal(content.includes('admin123'), false, `Leaked default password in ${file}`)
}
console.log('1. Verified dist/assets/*.js contain ZERO hardcoded Supabase URLs, JWT keys, or fallback passwords.')

// 2. Boot production server.mjs and test all Agent-Ready & Security endpoints
const proc = spawn('node', ['server.mjs'], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
})

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/robots.txt`)
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error('Server did not start in time')
}

try {
  await waitForServer()

  // robots.txt Content-Signal
  const robotsRes = await fetch(`${BASE}/robots.txt`)
  assert.equal(robotsRes.status, 200)
  const robotsTxt = await robotsRes.text()
  assert.match(robotsTxt, /Content-Signal:\s*search=yes,\s*ai-train=no/i)

  // llms.txt
  const llmsRes = await fetch(`${BASE}/llms.txt`)
  assert.equal(llmsRes.status, 200)
  assert.match(llmsRes.headers.get('content-type') || '', /^text\/plain/i)
  const llmsTxt = await llmsRes.text()
  assert.match(llmsTxt, /^#\s+Spread NFC/m)
  assert.match(llmsTxt, /^>\s+/m)
  assert.match(llmsTxt, /\[.*\]\(https:\/\/spreadnfc\.in\//)

  // MCP Server Card
  const mcpRes = await fetch(`${BASE}/.well-known/mcp/server-card.json`)
  assert.equal(mcpRes.status, 200)
  assert.match(mcpRes.headers.get('content-type') || '', /^application\/json/i)
  const mcpCard = await mcpRes.json()
  assert.equal(mcpCard.name, 'spreadnfc-mcp')
  assert.ok(mcpCard.endpoint)

  // Homepage HTML + Link header + Canonical + H1 + JSON-LD + Legal/Contact links
  const homeRes = await fetch(`${BASE}/`)
  assert.equal(homeRes.status, 200)
  const linkHdr = homeRes.headers.get('link') || ''
  assert.match(linkHdr, /rel="alternate"/)
  assert.match(linkHdr, /\/llms\.txt/)
  const homeHtml = await homeRes.text()
  assert.match(homeHtml, /<link\s+rel="canonical"\s+href="https:\/\/spreadnfc\.in\/"/i)
  assert.match(homeHtml, /<h1>.*<\/h1>/is)
  assert.match(homeHtml, /<script type="application\/ld\+json">/i)
  assert.match(homeHtml, /"sameAs"/)
  assert.match(homeHtml, /mailto:contact@spreadnfc\.in/)
  assert.match(homeHtml, /tel:\+919351042276/)
  assert.match(homeHtml, /href="\/about"/)
  assert.match(homeHtml, /href="\/contact"/)
  assert.match(homeHtml, /href="\/privacy"/)
  assert.match(homeHtml, /href="\/terms"/)

  // Accept: text/markdown
  const mdRes = await fetch(`${BASE}/`, { headers: { Accept: 'text/markdown' } })
  assert.equal(mdRes.status, 200)
  assert.match(mdRes.headers.get('content-type') || '', /^text\/markdown/i)
  const mdText = await mdRes.text()
  assert.match(mdText, /^#\s+Spread NFC/m)

  // Real 404 for unknown pages
  const notFoundRes = await fetch(`${BASE}/definitely-not-a-real-page-12345`)
  assert.equal(notFoundRes.status, 404)

  // Security: Admin RPC & DB blocked without HttpOnly admin cookie
  const unauthAdminRpc = await fetch(`${BASE}/api/rpc/admin_create_single_qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_qr_number: 'HACK-1', p_qr_name: 'Hack' }),
  })
  assert.equal(unauthAdminRpc.status, 401)

  const unauthOrdersDb = await fetch(`${BASE}/api/db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'orders', action: 'select' }),
  })
  assert.equal(unauthOrdersDb.status, 401)

  const unauthQrDb = await fetch(`${BASE}/api/db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'qr_codes', action: 'select' }),
  })
  assert.equal(unauthQrDb.status, 401)

  const unknownRpc = await fetch(`${BASE}/api/rpc/evil_fn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  assert.equal(unknownRpc.status, 404)

  const badQrRedir = await fetch(`${BASE}/q/bad!!qr`, { redirect: 'manual' })
  assert.equal(badQrRedir.status, 404)

  console.log('2. Verified all 17 Agent-Ready HTTP behaviors & server-side API security gates!')
  console.log('✅ ALL SERVER SECURITY & AGENT-READINESS CHECKS PASSED!')
} finally {
  proc.kill()
}

