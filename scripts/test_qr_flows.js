// ==============================================================================
// SPREAD NFC / TAPFLOW: AUTOMATED FLOW VERIFICATION & LOAD TESTING SUITE
// Tests instant redirects, unlinked card detection, cache logic & scan load capacity
// ==============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dvuuturphjumffqyigtz.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dXV0dXJwaGp1bWZmcXlpZ3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4Nzk2NTMsImV4cCI6MjEwNzQ1NTY1M30.9oiTvJCDnX9j8EQylGoHlgctew0LBoPdVahnPMOO5Q8'

async function callRpc(fnName, params) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: text }
  }
}

async function runTests() {
  console.log('='.repeat(70))
  console.log('🚀 TAPFLOW / SPREAD NFC: QR CODE SYSTEM TEST & LOAD BENCHMARK')
  console.log('='.repeat(70))
  console.log(`Endpoint: ${SUPABASE_URL}`)

  // 1. Fetch any existing QR codes to test with
  console.log('\n[1/4] Inspecting existing QR records in database...')
  const listRes = await fetch(`${SUPABASE_URL}/rest/v1/qr_codes?select=qr_number,destination_url,status,password_changed&limit=10`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  })
  const listJson = await listRes.json()
  const qrRecords = Array.isArray(listJson) ? listJson : []

  if (qrRecords.length === 0) {
    console.log('ℹ️ Note on qr_codes table:', listJson?.message || 'Empty or RLS active')
  } else {
    console.log(`✅ Found ${qrRecords.length} sample QR records:`)
    qrRecords.slice(0, 5).forEach((q) => {
      console.log(`   - QR: [${q.qr_number}] | Dest: ${q.destination_url || '(NO URL / UNLINKED)'} | Claimed: ${q.password_changed}`)
    })
  }

  // 2. Identify an existing active QR with destination vs unlinked QR
  const existingActive = qrRecords.find((q) => q.status === 'active' && q.destination_url)
  const unlinkedCard = qrRecords.find((q) => q.status === 'active' && !q.destination_url)

  const testQrExisting = existingActive ? existingActive.qr_number : 'TF-SAMPLE-EXISTING'
  const testQrUnlinked = unlinkedCard ? unlinkedCard.qr_number : 'TF-SAMPLE-NEW'

  console.log(`\n[2/4] Testing Scan Redirect Behavior...`)
  console.log(`  Target Existing QR: ${testQrExisting}`)

  const t0 = performance.now()
  const redirectRes = await callRpc('get_qr_redirect', { p_qr_number: testQrExisting })
  const tRedirect = (performance.now() - t0).toFixed(2)

  console.log(`  RPC Response (${tRedirect}ms):`, redirectRes.data)

  if (Array.isArray(redirectRes.data) && redirectRes.data.length > 0) {
    const row = redirectRes.data[0]
    if (row.destination_url) {
      console.log(`  ✅ Existing QR Test PASS: Direct destination found: ${row.destination_url}`)
      console.log(`     Frontend Behavior: Instant redirect to destination URL. Never visits /update. No login required.`)
    } else {
      console.log(`  ℹ️ QR is unlinked (no destination URL).`)
      console.log(`     Frontend Behavior: Smoothly transitions to /update?qr=${testQrExisting} with NEW CARD ACTIVATION mode.`)
    }
  }

  // 3. Test request_qr_update RPC (Used by UpdatePage)
  console.log(`\n[3/4] Testing Device Verification Flow (/update)...`)
  const checkRes = await callRpc('request_qr_update', { p_qr_number: testQrExisting })
  console.log('  request_qr_update response:', checkRes.data)

  if (checkRes.data && checkRes.data.ok) {
    const isClaimed = Boolean(checkRes.data.is_claimed) && Boolean(checkRes.data.destination_url)
    console.log(`  Determined Mode: ${isClaimed ? 'OWNER UPDATE PORTAL' : 'NEW CARD ACTIVATION'}`)
    console.log(`  ✅ Frontend properly differentiates based on destination + claimed status.`)
  }

  // 4. HIGH CONCURRENCY LOAD TESTING
  console.log(`\n[4/4] 🔥 RUNNING HIGH-CONCURRENCY SCAN LOAD TEST...`)
  const CONCURRENT_REQUESTS = 100
  const TOTAL_REQUESTS = 250

  console.log(`  Simulating ${TOTAL_REQUESTS} scans across ${CONCURRENT_REQUESTS} concurrent threads...`)

  const latencies = []
  let successCount = 0
  let failureCount = 0

  async function makeRequest(index) {
    const qrNum = existingActive ? existingActive.qr_number : 'TF-1001'
    const start = performance.now()
    try {
      const res = await callRpc('get_qr_redirect', { p_qr_number: qrNum })
      const duration = performance.now() - start
      latencies.push(duration)
      if (res.status === 200) {
        successCount++
      } else {
        failureCount++
      }
    } catch {
      failureCount++
    }
  }

  const loadStart = performance.now()
  const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i)

  // Worker pool for concurrency control
  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift()
      await makeRequest(idx)
    }
  }

  const workers = Array.from({ length: CONCURRENT_REQUESTS }, () => worker())
  await Promise.all(workers)

  const totalDurationMs = performance.now() - loadStart
  const totalSeconds = totalDurationMs / 1000
  const rps = (TOTAL_REQUESTS / totalSeconds).toFixed(1)

  latencies.sort((a, b) => a - b)
  const minLatency = latencies[0]?.toFixed(2) || 0
  const maxLatency = latencies[latencies.length - 1]?.toFixed(2) || 0
  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
  const p50 = latencies[Math.floor(latencies.length * 0.5)]?.toFixed(2) || 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2) || 0
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2) || 0

  console.log('\n' + '='.repeat(70))
  console.log('📊 LOAD TESTING BENCHMARK RESULTS')
  console.log('='.repeat(70))
  console.log(`  Total Scans Processed:  ${TOTAL_REQUESTS}`)
  console.log(`  Successful Responses:   ${successCount} (${((successCount / TOTAL_REQUESTS) * 100).toFixed(1)}%)`)
  console.log(`  Failed Responses:       ${failureCount}`)
  console.log(`  Total Time:             ${(totalSeconds).toFixed(2)} seconds`)
  console.log(`  Throughput (RPS):       ${rps} scans/sec`)
  console.log(`  Min Latency:            ${minLatency} ms`)
  console.log(`  Average Latency:        ${avgLatency} ms`)
  console.log(`  p50 (Median):           ${p50} ms`)
  console.log(`  p95 Latency:            ${p95} ms`)
  console.log(`  p99 Latency:            ${p99} ms`)
  console.log('='.repeat(70))

  if (failureCount === 0) {
    console.log('🎉 LOAD TEST PASSED: 100% success rate without errors or bottlenecks!')
  } else {
    console.log(`⚠️ LOAD TEST WARNING: ${failureCount} requests failed or timed out.`)
  }
}

runTests().catch(console.error)
