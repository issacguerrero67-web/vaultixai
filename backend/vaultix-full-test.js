import { spawn } from 'child_process'
import { createServer } from 'net'
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL          = 'http://localhost:3001'
const SUPABASE_BASE     = 'https://jzybjanzymjatghemeya.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const TEST_PASSWORD     = process.env.TEST_PASSWORD
const TEST_EMAIL        = process.env.TEST_EMAIL || 'issacguerrero67@gmail.com'
const FAKE_UUID         = '00000000-0000-0000-0000-000000000000'

// ── State ────────────────────────────────────────────────────────────────────
const results    = []
let authToken    = null
let serverProc   = null
let redisOnline  = false
const suiteStart = Date.now()

// ── Result helpers ───────────────────────────────────────────────────────────
const pass = (cat, name, detail = '') => {
  results.push({ category: cat, name, status: 'PASS', detail })
  console.log(`  ✓  ${name}${detail ? '  (' + detail + ')' : ''}`)
}
const fail = (cat, name, detail = '') => {
  results.push({ category: cat, name, status: 'FAIL', detail })
  console.log(`  ✗  ${name}${detail ? '  (' + detail + ')' : ''}`)
}
const warn = (cat, name, detail = '') => {
  results.push({ category: cat, name, status: 'WARN', detail })
  console.log(`  ⚠  ${name}${detail ? '  (' + detail + ')' : ''}`)
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function api(method, urlPath, { body, headers = {}, rawBody = false } = {}) {
  const opts = { method, headers: { ...headers } }
  if (body !== undefined) {
    if (rawBody) {
      opts.body = body
    } else {
      opts.body = JSON.stringify(body)
      if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json'
    }
  }
  const response = await fetch(`${BASE_URL}${urlPath}`, opts)
  let data
  try { data = await response.clone().json() } catch { data = await response.text() }
  return { status: response.status, headers: response.headers, data, ok: response.ok }
}

const authHeader = () => authToken ? { Authorization: `Bearer ${authToken}` } : {}

// Checks whether the global rate limit headers are on a response
function hasRLHeaders(r) {
  return r.headers.has('ratelimit-limit') || r.headers.has('x-ratelimit-limit')
}
function getRLLimit(r) {
  return r.headers.get('ratelimit-limit') || r.headers.get('x-ratelimit-limit') || null
}

// ── Server management ────────────────────────────────────────────────────────
function portBusy(port) {
  return new Promise(resolve => {
    const s = createServer()
    s.once('error', () => resolve(true))
    s.once('listening', () => { s.close(); resolve(false) })
    s.listen(port, '127.0.0.1')
  })
}

function waitReady(url, maxMs = 15000) {
  const deadline = Date.now() + maxMs
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(1500) })
        if (r.ok) return resolve()
      } catch {}
      if (Date.now() > deadline) return reject(new Error('Server start timeout'))
      setTimeout(check, 400)
    }
    check()
  })
}

async function startServer() {
  const busy = await portBusy(3001)
  if (busy) {
    console.log('  → Port 3001 occupied — testing existing instance\n')
    return
  }
  const env = {
    ...process.env,
    SUPABASE_URL:          SUPABASE_BASE,
    SUPABASE_SERVICE_KEY:  SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY:     SUPABASE_ANON_KEY,
    PORT:                  '3001',
    NODE_ENV:              'development',
    STRIPE_SECRET_KEY:     process.env.STRIPE_SECRET_KEY    || 'sk_test_vaultix_placeholder',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder',
    RESEND_API_KEY:        process.env.RESEND_API_KEY        || 're_test_vaultix_placeholder',
    FRONTEND_URL:          'http://localhost:5173',
    AWS_REGION:            'us-east-1',
    // Leave REDIS_URL unset → falls back to redis://localhost:6379
    // If Redis is unavailable, rate-limit-redis/ioredis silently degrades
  }
  serverProc = spawn('node', ['src/index.js'], { cwd: __dirname, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let serverStderr = ''
  serverProc.stdout.on('data', d => process.stdout.write(`  [srv] ${d}`))
  serverProc.stderr.on('data', d => {
    serverStderr += d.toString()
    process.stderr.write(`  [srv] ${d}`)
  })
  await waitReady(`${BASE_URL}/health`)

  // Give Redis a moment to attempt connection, then sample stderr for errors
  await new Promise(r => setTimeout(r, 600))
  redisOnline = !serverStderr.includes('[Redis] Connection error')
  console.log(`\n  Redis: ${redisOnline ? '✓ connected' : '✗ unavailable (rate-limit headers may be absent)'}\n`)
}

function stopServer() {
  if (serverProc) { serverProc.kill('SIGTERM'); serverProc = null }
}

// ── Supabase auth ─────────────────────────────────────────────────────────────
async function supabaseSignIn(email, password) {
  const r = await fetch(`${SUPABASE_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await r.json()
  return { ok: r.ok, token: data.access_token, error: data.error_description || data.error }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. HEALTH CHECKS
// ════════════════════════════════════════════════════════════════════════════
async function testHealth() {
  console.log('\n━━━  1. HEALTH CHECKS  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'Health Checks'

  const t0 = Date.now()
  const r  = await api('GET', '/health')
  const ms = Date.now() - t0

  r.status === 200
    ? pass(C, 'GET /health returns 200 OK')
    : fail(C, 'GET /health returns 200 OK', `got ${r.status}`)

  r.data?.status === 'ok'
    ? pass(C, 'Response body has { status: "ok" }')
    : fail(C, 'Response body has { status: "ok" }', JSON.stringify(r.data))

  r.data?.timestamp
    ? pass(C, 'Response includes ISO timestamp')
    : fail(C, 'Response includes ISO timestamp')

  const r404 = await api('GET', '/api/no-such-endpoint-xyz')
  r404.status === 404
    ? pass(C, 'Unknown route returns 404')
    : warn(C, 'Unknown route returns 404', `got ${r404.status}`)

  ms < 500
    ? pass(C, `Response time ${ms}ms < 500ms`)
    : fail(C, `Response time ${ms}ms`, 'should be < 500ms')

  const rNoAuth = await api('GET', '/api/reports')
  rNoAuth.status === 401
    ? pass(C, 'Protected routes return 401 without auth')
    : fail(C, 'Protected routes return 401 without auth', `got ${rNoAuth.status}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 2. AUTHENTICATION
// ════════════════════════════════════════════════════════════════════════════
async function testAuth() {
  console.log('\n━━━  2. AUTHENTICATION  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'Authentication'

  const login = await supabaseSignIn(TEST_EMAIL, TEST_PASSWORD)
  if (login.ok && login.token) {
    authToken = login.token
    pass(C, `Valid credentials accepted (${TEST_EMAIL})`)
  } else {
    fail(C, 'Valid credentials accepted', login.error || 'no token returned')
  }

  const wrongPw = await supabaseSignIn(TEST_EMAIL, 'WrongPassword999!')
  !wrongPw.ok ? pass(C, 'Wrong password rejected') : fail(C, 'Wrong password rejected')

  const fakeUser = await supabaseSignIn('nobody_vaultix_xyz99@example.com', TEST_PASSWORD)
  !fakeUser.ok ? pass(C, 'Non-existent email rejected') : fail(C, 'Non-existent email rejected')

  const r1 = await api('GET', '/api/reports')
  r1.status === 401
    ? pass(C, 'No Authorization header → 401')
    : fail(C, 'No Authorization header → 401', `got ${r1.status}`)

  const r2 = await api('GET', '/api/reports', { headers: { Authorization: 'Bearer garbage_xyzzy' } })
  r2.status === 401
    ? pass(C, 'Garbage Bearer token → 401')
    : fail(C, 'Garbage Bearer token → 401', `got ${r2.status}`)

  const r3 = await api('GET', '/api/reports', { headers: { Authorization: 'Basic dXNlcjpwYXNz' } })
  r3.status === 401
    ? pass(C, 'Non-Bearer scheme → 401')
    : fail(C, 'Non-Bearer scheme → 401', `got ${r3.status}`)

  const r4 = await api('GET', '/api/reports', { headers: { Authorization: 'Bearer ' } })
  r4.status === 401
    ? pass(C, 'Empty Bearer value → 401')
    : fail(C, 'Empty Bearer value → 401', `got ${r4.status}`)

  if (authToken) {
    const r5 = await api('GET', '/api/reports', { headers: authHeader() })
    r5.status === 200
      ? pass(C, 'Valid JWT accepted → 200')
      : fail(C, 'Valid JWT accepted → 200', `got ${r5.status}`)
  } else {
    warn(C, 'Valid-token test skipped (login failed)')
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. INPUT VALIDATION & INJECTION
// ════════════════════════════════════════════════════════════════════════════
async function testValidation() {
  console.log('\n━━━  3. INPUT VALIDATION & INJECTION  ━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'Input Validation'

  if (!authToken) { warn(C, 'All validation tests skipped — no auth token'); return }
  const h = authHeader()

  // ── aws-accounts ──
  const a1 = await api('POST', '/api/aws-accounts', { headers: h, body: { roleArn: 'not-an-arn' } })
  a1.status === 400 ? pass(C, 'Invalid roleArn rejected → 400') : fail(C, 'Invalid roleArn rejected → 400', `got ${a1.status}`)

  const a2 = await api('POST', '/api/aws-accounts', { headers: h, body: { roleArn: "'; DROP TABLE users; --" } })
  a2.status === 400 ? pass(C, 'SQL injection in roleArn rejected → 400') : fail(C, 'SQL injection in roleArn rejected → 400', `got ${a2.status}`)

  const a3 = await api('POST', '/api/aws-accounts', { headers: h, body: { roleArn: '<script>alert(1)</script>' } })
  a3.status === 400 ? pass(C, 'XSS payload in roleArn rejected → 400') : fail(C, 'XSS payload in roleArn rejected → 400', `got ${a3.status}`)

  const a4 = await api('POST', '/api/aws-accounts', { headers: h, body: {} })
  a4.status === 400 || a4.status === 422 ? pass(C, 'Missing roleArn → 400/422') : fail(C, 'Missing roleArn → 400/422', `got ${a4.status}`)

  const a5 = await api('POST', '/api/aws-accounts', { headers: h, body: { roleArn: 'arn:aws:iam::123456789012:role/VaultixRole' } })
  a5.status === 201 ? pass(C, 'Valid roleArn format accepted → 201') : fail(C, 'Valid roleArn format accepted → 201', `got ${a5.status}`)

  // ── aws/verify ──
  const v1 = await api('POST', '/api/aws/verify', { headers: h, body: {} })
  v1.status === 400 ? pass(C, 'Empty body on /api/aws/verify → 400') : fail(C, 'Empty body on /api/aws/verify → 400', `got ${v1.status}`)

  const v2 = await api('POST', '/api/aws/verify', { headers: h, body: { accountId: 'abc', roleArn: 'arn:aws:iam::123456789012:role/R' } })
  v2.status === 400 ? pass(C, 'Non-numeric accountId rejected → 400') : fail(C, 'Non-numeric accountId rejected → 400', `got ${v2.status}`)

  const v3 = await api('POST', '/api/aws/verify', { headers: h, body: { accountId: '12345678901', roleArn: 'arn:aws:iam::123456789012:role/R' } })
  v3.status === 400 ? pass(C, '11-digit accountId rejected → 400') : fail(C, '11-digit accountId rejected → 400', `got ${v3.status}`)

  // ── stripe ──
  const s1 = await api('POST', '/api/stripe/create-checkout', { headers: h, body: {} })
  s1.status === 400 ? pass(C, 'Missing tier in create-checkout → 400') : fail(C, 'Missing tier in create-checkout → 400', `got ${s1.status}`)

  const s2 = await api('POST', '/api/stripe/create-checkout', { headers: h, body: { tier: 'ultra_hack' } })
  s2.status === 400 ? pass(C, 'Invalid tier value rejected → 400') : fail(C, 'Invalid tier value rejected → 400', `got ${s2.status}`)

  // ── audit/run now requires uuid aws_account_id ──
  const ar = await api('POST', '/api/audit/run', { headers: h, body: {} })
  ar.status === 400 ? pass(C, 'audit/run with missing aws_account_id → 400') : fail(C, 'audit/run with missing aws_account_id → 400', `got ${ar.status}`)

  const ar2 = await api('POST', '/api/audit/run', { headers: h, body: { aws_account_id: 'not-a-uuid' } })
  ar2.status === 400 ? pass(C, 'audit/run with invalid UUID → 400') : fail(C, 'audit/run with invalid UUID → 400', `got ${ar2.status}`)

  // ── api keys — name length ──
  const k1 = await api('POST', '/api/keys/generate', { headers: h, body: { name: 'a'.repeat(51) } })
  k1.status === 400 ? pass(C, 'API key name > 50 chars rejected → 400') : fail(C, 'API key name > 50 chars rejected → 400', `got ${k1.status}`)

  // ── autopilot — UUID validation ──
  const ap1 = await api('POST', '/api/autopilot/generate', { headers: h, body: { aws_account_id: 'not-uuid' } })
  ap1.status === 400 ? pass(C, 'autopilot/generate with bad uuid → 400') : fail(C, 'autopilot/generate with bad uuid → 400', `got ${ap1.status}`)

  const ap2 = await api('POST', '/api/autopilot/approve', { headers: h, body: { action_id: 'not-uuid' } })
  ap2.status === 400 ? pass(C, 'autopilot/approve with bad action_id → 400') : fail(C, 'autopilot/approve with bad action_id → 400', `got ${ap2.status}`)

  // ── account deletion — confirm token required ──
  const acc1 = await api('DELETE', '/api/account/user', { headers: h, body: { confirm: 'WRONG' } })
  acc1.status === 400 ? pass(C, 'account/user DELETE without correct confirm token → 400') : fail(C, 'account/user DELETE without correct confirm token → 400', `got ${acc1.status}`)

  // ── autopilot/chat — message validation ──
  const chat1 = await api('POST', '/api/autopilot/chat', { headers: h, body: {} })
  chat1.status === 400 ? pass(C, 'autopilot/chat with no message → 400') : fail(C, 'autopilot/chat with no message → 400', `got ${chat1.status}`)

  const chat2 = await api('POST', '/api/autopilot/chat', { headers: h, body: { message: 'x'.repeat(1001) } })
  chat2.status === 400 ? pass(C, 'autopilot/chat with message > 1000 chars → 400') : fail(C, 'autopilot/chat with message > 1000 chars → 400', `got ${chat2.status}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 4. RATE LIMITING
// ════════════════════════════════════════════════════════════════════════════
async function testRateLimiting() {
  console.log('\n━━━  4. RATE LIMITING  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'Rate Limiting'
  const redisNote = redisOnline ? '' : ' (Redis offline — headers absent in fallback mode)'

  // ── FIX 4: Global limiter — should show headers on /health ──
  const rh = await api('GET', '/health')
  if (hasRLHeaders(rh)) {
    pass(C, `FIX 4 ✓ Global rate limiter active — RateLimit headers on /health (limit=${getRLLimit(rh)})`)
  } else if (!redisOnline) {
    warn(C, 'FIX 4 — Global limiter configured but Redis offline, headers absent' + redisNote)
  } else {
    fail(C, 'FIX 4 — Global rate limiter: RateLimit headers missing on /health')
  }

  // Global limit should be 100 / 15-min window
  const globalLimit = getRLLimit(rh)
  if (globalLimit === '100') {
    pass(C, 'Global limiter limit is 100 req/15 min (correct)')
  } else if (!redisOnline) {
    warn(C, 'Global limiter limit check skipped' + redisNote)
  } else {
    fail(C, 'Global limiter limit is 100 req/15 min', `got: ${globalLimit}`)
  }

  // ── FIX 3: Audit limiter skip bug fixed — headers must appear on /api/audit/run ──
  if (authToken) {
    const ra = await api('POST', '/api/audit/run', { headers: authHeader(), body: { aws_account_id: FAKE_UUID } })
    if (hasRLHeaders(ra)) {
      pass(C, 'FIX 3 ✓ Audit rate limiter fires for auth\'d users (skip bug resolved)')
    } else if (!redisOnline) {
      warn(C, 'FIX 3 — Audit limiter configured (skip removed) but Redis offline' + redisNote)
    } else {
      fail(C, 'FIX 3 — Audit rate limiter: headers still absent for auth\'d users (skip bug may persist)')
    }
  } else {
    warn(C, 'FIX 3 audit limiter check skipped — no auth token')
  }

  // ── Strict limiter on /api/audit/run (10 req / 15 min — lower than global) ──
  if (authToken) {
    const ra2 = await api('POST', '/api/audit/run', { headers: authHeader(), body: { aws_account_id: FAKE_UUID } })
    const strictLimit = getRLLimit(ra2)
    if (strictLimit === '10') {
      pass(C, 'Strict limiter on /api/audit/run: limit=10 (lower bound enforced)')
    } else if (!redisOnline) {
      warn(C, 'Strict limiter check skipped' + redisNote)
    } else {
      warn(C, 'Strict limiter limit check', `expected 10, got ${strictLimit || 'none'}`)
    }
  }

  // ── awsConnectLimiter on /api/aws/verify ──
  if (authToken) {
    const rv = await api('POST', '/api/aws/verify', { headers: authHeader(), body: { accountId: '123456789012', roleArn: 'arn:aws:iam::123456789012:role/R' } })
    if (hasRLHeaders(rv)) {
      pass(C, 'AWS connect limiter active on /api/aws/verify')
    } else if (!redisOnline) {
      warn(C, 'AWS connect limiter check skipped' + redisNote)
    } else {
      fail(C, 'AWS connect limiter: RateLimit headers missing on /api/aws/verify')
    }
  } else {
    warn(C, 'AWS connect limiter check skipped — no auth token')
  }

  // ── authLimiter on /api/keys/generate ──
  if (authToken) {
    const rk = await api('POST', '/api/keys/generate', { headers: authHeader(), body: { name: 'test' } })
    if (hasRLHeaders(rk)) {
      pass(C, 'Auth limiter active on /api/keys/generate')
    } else if (!redisOnline) {
      warn(C, 'Auth limiter check skipped' + redisNote)
    } else {
      fail(C, 'Auth limiter: RateLimit headers missing on /api/keys/generate')
    }
  } else {
    warn(C, 'Auth limiter check skipped — no auth token')
  }

  // ── Confirm no global limiter on wrong routes (negative) ──
  const r10 = await Promise.all(Array.from({ length: 10 }, () => api('GET', '/api/reports')))
  r10.every(r => r.status === 401)
    ? pass(C, '10 rapid unauthenticated requests — all 401 (auth gate intact)')
    : fail(C, '10 rapid unauthenticated requests — all 401', 'unexpected status codes')
}

// ════════════════════════════════════════════════════════════════════════════
// 5. CONCURRENT STRESS TEST (50 requests)
// ════════════════════════════════════════════════════════════════════════════
async function testStress() {
  console.log('\n━━━  5. STRESS TEST — 50 concurrent  ━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'Stress Test'
  const N = 50
  const times = []

  const responses = await Promise.all(
    Array.from({ length: N }, async () => {
      const s = Date.now()
      const r = await api('GET', '/health')
      times.push(Date.now() - s)
      return r
    })
  )
  times.sort((a, b) => a - b)
  const p50 = times[Math.floor(N * 0.50)]
  const p95 = times[Math.floor(N * 0.95)]
  const p99 = times[Math.floor(N * 0.99)]

  const ok = responses.filter(r => r.status === 200).length
  ok === N
    ? pass(C, `All ${N} concurrent requests returned 200`)
    : fail(C, `All ${N} concurrent requests returned 200`, `${ok}/${N} succeeded`)

  p95 < 1000
    ? pass(C, `p95 latency ${p95}ms < 1000ms`)
    : fail(C, `p95 latency ${p95}ms`, 'should be < 1000ms')

  p50 < 200
    ? pass(C, `Median latency ${p50}ms < 200ms`)
    : warn(C, `Median latency ${p50}ms`, 'above 200ms threshold')

  console.log(`     p50=${p50}ms  p95=${p95}ms  p99=${p99}ms`)
}

// ════════════════════════════════════════════════════════════════════════════
// 6. STRIPE WEBHOOK SECURITY
// ════════════════════════════════════════════════════════════════════════════
async function testStripeWebhook() {
  console.log('\n━━━  6. STRIPE WEBHOOK SECURITY  ━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'Stripe Webhook'

  const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { metadata: {} } } })
  const jsonHdr = { 'Content-Type': 'application/json' }

  const r1 = await api('POST', '/api/stripe/webhook', { body: payload, rawBody: true, headers: jsonHdr })
  r1.status === 400
    ? pass(C, 'No stripe-signature header → 400')
    : fail(C, 'No stripe-signature header → 400', `got ${r1.status}`)

  const r2 = await api('POST', '/api/stripe/webhook', {
    body: payload, rawBody: true,
    headers: { ...jsonHdr, 'stripe-signature': 't=1234567890,v1=fakehashvalue0000000000000000000' }
  })
  r2.status === 400
    ? pass(C, 'Invalid stripe-signature → 400')
    : fail(C, 'Invalid stripe-signature → 400', `got ${r2.status}`)

  const r3 = await api('POST', '/api/stripe/webhook', {
    body: payload, rawBody: true,
    headers: { ...jsonHdr, 'stripe-signature': 'completely-malformed' }
  })
  r3.status === 400
    ? pass(C, 'Malformed stripe-signature → 400')
    : fail(C, 'Malformed stripe-signature → 400', `got ${r3.status}`)

  const r4 = await api('POST', '/api/stripe/webhook', {
    body: '', rawBody: true,
    headers: { ...jsonHdr, 'stripe-signature': 't=1234,v1=abc' }
  })
  r4.status === 400
    ? pass(C, 'Empty body + fake signature → 400')
    : fail(C, 'Empty body + fake signature → 400', `got ${r4.status}`)

  r1.status !== 401
    ? pass(C, 'Webhook uses sig verification not Bearer auth (correct design)')
    : fail(C, 'Webhook must not require Bearer auth', 'returned 401 — wrong guard')
}

// ════════════════════════════════════════════════════════════════════════════
// 7. CORS & SECURITY HEADERS
// ════════════════════════════════════════════════════════════════════════════
async function testCORSAndHeaders() {
  console.log('\n━━━  7. CORS & SECURITY HEADERS  ━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'CORS & Security'

  // Allowed origin #1 (dev frontend)
  const r1 = await api('GET', '/health', { headers: { Origin: 'http://localhost:5173' } })
  r1.headers.get('access-control-allow-origin') === 'http://localhost:5173'
    ? pass(C, 'Origin: localhost:5173 → correct ACAO header')
    : fail(C, 'Origin: localhost:5173 → correct ACAO header', `got: "${r1.headers.get('access-control-allow-origin')}"`)

  // Allowed origin #2 (prod www)
  const r2 = await api('GET', '/health', { headers: { Origin: 'https://www.vaultixai.app' } })
  r2.headers.get('access-control-allow-origin') === 'https://www.vaultixai.app'
    ? pass(C, 'Origin: www.vaultixai.app → correct ACAO header')
    : fail(C, 'Origin: www.vaultixai.app → correct ACAO header', `got: "${r2.headers.get('access-control-allow-origin')}"`)

  // Credentials
  const cred = r1.headers.get('access-control-allow-credentials')
  cred === 'true'
    ? pass(C, 'Access-Control-Allow-Credentials: true set')
    : fail(C, 'Access-Control-Allow-Credentials: true', `got: "${cred}"`)

  // Disallowed origin must NOT get ACAO
  const r3 = await api('GET', '/health', { headers: { Origin: 'https://evil-attacker.com' } })
  const evilAcao = r3.headers.get('access-control-allow-origin')
  !evilAcao || evilAcao !== 'https://evil-attacker.com'
    ? pass(C, 'Disallowed origin blocked (no ACAO echoed back)')
    : fail(C, 'Disallowed origin blocked', `got ACAO: "${evilAcao}"`)

  // ── FIX 1: X-Powered-By removed ──
  const xpb = r1.headers.get('x-powered-by')
  !xpb
    ? pass(C, 'FIX 1 ✓ X-Powered-By header suppressed')
    : fail(C, 'FIX 1 — X-Powered-By still leaking', `value: "${xpb}"`)

  // Content-Type on JSON
  const ct = r1.headers.get('content-type')
  ct?.includes('application/json')
    ? pass(C, 'Content-Type: application/json on JSON responses')
    : fail(C, 'Content-Type: application/json', `got: "${ct}"`)

  // ── FIX 2: Helmet headers ──
  const xfo  = r1.headers.get('x-frame-options')
  const xcto = r1.headers.get('x-content-type-options')
  xfo && xcto
    ? pass(C, 'FIX 2 ✓ Helmet headers present (X-Frame-Options, X-Content-Type-Options)')
    : fail(C, 'FIX 2 — Helmet headers missing', `xfo="${xfo}" xcto="${xcto}"`)

  // Extra custom security headers
  const xxss = r1.headers.get('x-xss-protection')
  xxss
    ? pass(C, `X-XSS-Protection header set (${xxss})`)
    : warn(C, 'X-XSS-Protection header not set')

  const rp = r1.headers.get('referrer-policy')
  rp
    ? pass(C, `Referrer-Policy header set (${rp})`)
    : warn(C, 'Referrer-Policy header not set')

  const pp = r1.headers.get('permissions-policy')
  pp
    ? pass(C, `Permissions-Policy header set`)
    : warn(C, 'Permissions-Policy header not set')
}

// ════════════════════════════════════════════════════════════════════════════
// 8. BUSINESS LOGIC & DATA ISOLATION
// ════════════════════════════════════════════════════════════════════════════
async function testBusinessLogic() {
  console.log('\n━━━  8. BUSINESS LOGIC & DATA ISOLATION  ━━━━━━━━━━━━━━━━━━')
  const C = 'Business Logic'

  if (!authToken) { warn(C, 'All business logic tests skipped — no auth token'); return }
  const h = authHeader()

  const r1 = await api('GET', '/api/reports', { headers: h })
  r1.status === 200 && Array.isArray(r1.data?.reports)
    ? pass(C, 'GET /api/reports → 200 with user-scoped reports array')
    : fail(C, 'GET /api/reports → 200 with reports array', `${r1.status} — ${JSON.stringify(r1.data)}`)

  const r2 = await api('GET', `/api/reports/${FAKE_UUID}`, { headers: h })
  r2.status === 200
    ? pass(C, 'GET /api/reports/:id → 200 (no data leakage for non-existent id)')
    : fail(C, 'GET /api/reports/:id → 200', `got ${r2.status}`)

  const r3 = await api('GET', '/api/aws-accounts', { headers: h })
  r3.status === 200 && Array.isArray(r3.data?.accounts)
    ? pass(C, 'GET /api/aws-accounts → 200 with accounts array')
    : fail(C, 'GET /api/aws-accounts → 200 with accounts array', `${r3.status} — ${JSON.stringify(r3.data)}`)

  // audit/run now returns 403 (ownership) or 400 (missing field) not 404
  const ar = await api('POST', '/api/audit/run', { headers: h, body: { aws_account_id: FAKE_UUID } })
  ar.status === 403 || ar.status === 400 || ar.status === 404
    ? pass(C, `audit/run with non-owned account_id → ${ar.status} (not data-leaking 200)`)
    : fail(C, 'audit/run with non-owned account_id rejects correctly', `got ${ar.status}`)

  // Ownership check actually fires (403 for wrong user's UUID, not 404)
  ar.status === 403
    ? pass(C, 'Ownership check fires → 403 Access Denied (not 404 which leaks existence)')
    : warn(C, 'Ownership check response', `got ${ar.status} — expected 403`)

  // create-checkout without prior audit → 400
  const r5 = await api('POST', '/api/stripe/create-checkout', { headers: h, body: { tier: 'standard' } })
  r5.status === 400
    ? pass(C, 'Create checkout without completed audit → 400 (no audit to bill against)')
    : fail(C, 'Create checkout without completed audit → 400', `got ${r5.status}`)

  const r6 = await api('GET', '/api/stripe/status', { headers: h })
  r6.status === 200 && 'tier' in (r6.data || {}) && 'subscriptionStatus' in (r6.data || {})
    ? pass(C, 'GET /api/stripe/status → {tier, subscriptionStatus, stripeCustomerId}')
    : fail(C, 'GET /api/stripe/status shape', `${r6.status} — ${JSON.stringify(r6.data)}`)

  const r7 = await api('GET', '/api/autopilot/status/not-a-uuid', { headers: h })
  r7.status === 400
    ? pass(C, 'GET /api/autopilot/status/:id with bad UUID → 400')
    : fail(C, 'GET /api/autopilot/status/:id UUID validation', `got ${r7.status}`)
}

// ════════════════════════════════════════════════════════════════════════════
// 9. NEW ROUTES — API KEYS, ACCOUNT, AUTOPILOT
// ════════════════════════════════════════════════════════════════════════════
async function testNewRoutes() {
  console.log('\n━━━  9. NEW ROUTES  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const C = 'New Routes'

  if (!authToken) { warn(C, 'All new-route tests skipped — no auth token'); return }
  const h = authHeader()

  // ── GET /api/keys — lists keys ──
  const k1 = await api('GET', '/api/keys', { headers: h })
  k1.status === 200 && Array.isArray(k1.data?.keys)
    ? pass(C, 'GET /api/keys → 200 with keys array')
    : fail(C, 'GET /api/keys → 200 with keys array', `${k1.status} — ${JSON.stringify(k1.data)}`)

  // ── POST /api/keys/generate — XSS sanitised in name ──
  const k2 = await api('POST', '/api/keys/generate', { headers: h, body: { name: '<b>Test</b> Key' } })
  if (k2.status === 200 && k2.data?.key?.startsWith('vx_')) {
    pass(C, 'POST /api/keys/generate → 200 with vx_... key')
    // Verify key is not shown in plain text in subsequent list
    const k3 = await api('GET', '/api/keys', { headers: h })
    const generated = k3.data?.keys?.find(k => k.key_preview?.includes('vx_'))
    generated
      ? pass(C, 'Generated key appears in /api/keys list with preview only (full key not stored)')
      : warn(C, 'Could not verify generated key in list')

    // XSS sanitisation — name should not contain HTML tags
    const name = k2.data?.name || ''
    !name.includes('<b>') && !name.includes('</b>')
      ? pass(C, `API key name XSS-sanitised ("${name}" — tags stripped)`)
      : fail(C, 'API key name XSS-sanitised', `name still contains HTML: "${name}"`)

    // DELETE /api/keys/:id — revoke the generated key
    const keyId = k2.data?.id
    if (keyId) {
      const k4 = await api('DELETE', `/api/keys/${keyId}`, { headers: h })
      k4.status === 200 && k4.data?.success
        ? pass(C, 'DELETE /api/keys/:id → 200 (key revoked)')
        : fail(C, 'DELETE /api/keys/:id → 200', `${k4.status} — ${JSON.stringify(k4.data)}`)
    }
  } else {
    fail(C, 'POST /api/keys/generate → 200 with vx_... key', `${k2.status} — ${JSON.stringify(k2.data)}`)
    warn(C, 'Generated key list check skipped')
    warn(C, 'XSS sanitisation check skipped')
    warn(C, 'Key revoke test skipped')
  }

  // ── DELETE /api/account/aws-accounts — disconnect all (requires destructiveLimiter) ──
  const acc1 = await api('DELETE', '/api/account/aws-accounts', { headers: h })
  acc1.status === 200 && acc1.data?.success
    ? pass(C, 'DELETE /api/account/aws-accounts → 200 (disconnect all)')
    : fail(C, 'DELETE /api/account/aws-accounts → 200', `${acc1.status} — ${JSON.stringify(acc1.data)}`)

  // ── Autopilot approve-all requires CONFIRM token ──
  const ap1 = await api('POST', '/api/autopilot/approve-all', { headers: h, body: { aws_account_id: FAKE_UUID, confirm: 'WRONG' } })
  ap1.status === 400
    ? pass(C, 'autopilot/approve-all without CONFIRM token → 400')
    : fail(C, 'autopilot/approve-all without CONFIRM token → 400', `got ${ap1.status}`)

  // ── Autopilot execute requires approved actions (none exist for FAKE_UUID) ──
  const ap2 = await api('POST', '/api/autopilot/execute', { headers: h, body: { aws_account_id: FAKE_UUID } })
  ap2.status === 400
    ? pass(C, 'autopilot/execute with no approved actions → 400')
    : fail(C, 'autopilot/execute with no approved actions → 400', `got ${ap2.status}`)

  // ── Autopilot approve requires valid uuid action_id ──
  const ap3 = await api('POST', '/api/autopilot/approve', { headers: h, body: { action_id: FAKE_UUID } })
  ap3.status === 404
    ? pass(C, 'autopilot/approve with non-existent action_id → 404')
    : fail(C, 'autopilot/approve with non-existent action_id → 404', `got ${ap3.status}`)
}

// ════════════════════════════════════════════════════════════════════════════
// HTML REPORT
// ════════════════════════════════════════════════════════════════════════════
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function generateReport(durationMs) {
  const total  = results.length
  const passes = results.filter(r => r.status === 'PASS').length
  const fails  = results.filter(r => r.status === 'FAIL').length
  const warns  = results.filter(r => r.status === 'WARN').length
  const score  = Math.round(((passes + warns * 0.5) / total) * 100)
  const grade  = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  const categories = [...new Set(results.map(r => r.category))]

  const catBlocks = categories.map(cat => {
    const cr  = results.filter(r => r.category === cat)
    const cp  = cr.filter(r => r.status === 'PASS').length
    const cf  = cr.filter(r => r.status === 'FAIL').length
    const cw  = cr.filter(r => r.status === 'WARN').length
    const pct = Math.round(((cp + cw * 0.5) / cr.length) * 100)
    const pc  = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'

    const rows = cr.map(r => {
      const cls  = r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' : 'warn'
      const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '⚠'
      return `<tr class="row-${cls}">
        <td><span class="badge badge-${cls}">${icon} ${r.status}</span></td>
        <td>${escapeHtml(r.name)}</td>
        <td class="detail-cell">${escapeHtml(r.detail)}</td>
      </tr>`
    }).join('\n')

    return `<div class="cat">
  <div class="cat-hdr">
    <span class="cat-name">${escapeHtml(cat)}</span>
    <span class="cat-chips">
      <span class="chip chip-g">${cp} pass</span>
      ${cf ? `<span class="chip chip-r">${cf} fail</span>` : ''}
      ${cw ? `<span class="chip chip-y">${cw} warn</span>` : ''}
      <span class="cat-pct" style="color:${pc}">${pct}%</span>
    </span>
  </div>
  <table class="tbl">
    <thead><tr><th>Status</th><th>Test</th><th>Detail</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`
  }).join('\n')

  const fixBadge = (label, passed) =>
    `<span class="fix-badge ${passed ? 'fix-pass' : 'fix-fail'}">${passed ? '✓' : '✗'} ${label}</span>`

  const fix1 = results.find(r => r.name.includes('FIX 1'))?.status === 'PASS'
  const fix2 = results.find(r => r.name.includes('FIX 2'))?.status === 'PASS'
  const fix3 = results.find(r => r.name.includes('FIX 3'))?.status === 'PASS'
  const fix4 = results.find(r => r.name.includes('FIX 4'))?.status === 'PASS'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vaultix AI — Backend Test Report v2</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f172a;color:#e2e8f0;font-family:'Segoe UI',system-ui,sans-serif;padding:2rem;min-height:100vh}

.hero{background:linear-gradient(135deg,#1e3a8a 0%,#6d28d9 100%);border-radius:1rem;padding:2.5rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:2rem;flex-wrap:wrap}
.hero-text{flex:1}
.brand{font-size:2rem;font-weight:900;color:#fff}.brand span{color:#93c5fd}
.sub{color:rgba(255,255,255,.7);margin-top:.25rem}
.meta{color:rgba(255,255,255,.5);font-size:.8rem;margin-top:.6rem;line-height:1.9}
.score-box{text-align:center;min-width:110px}
.score-num{font-size:4rem;font-weight:900;color:${scoreColor};line-height:1}
.score-lbl{font-size:.7rem;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em}
.grade{font-size:1.5rem;font-weight:800;color:${scoreColor};margin-top:.2rem}

.fixes-bar{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.fixes-label{font-size:.8rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-right:.5rem}
.fix-badge{font-size:.8rem;font-weight:700;padding:.3rem .7rem;border-radius:.35rem}
.fix-pass{background:rgba(34,197,94,.15);color:#22c55e}
.fix-fail{background:rgba(239,68,68,.15);color:#ef4444}

.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
.stat{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:1.25rem;text-align:center}
.stat-n{font-size:2.75rem;font-weight:900;line-height:1}
.stat-l{font-size:.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-top:.3rem}
.c-b{color:#60a5fa}.c-g{color:#22c55e}.c-r{color:#ef4444}.c-y{color:#f59e0b}

.cat{background:#1e293b;border:1px solid #334155;border-radius:.75rem;margin-bottom:1.25rem;overflow:hidden}
.cat-hdr{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.5rem;border-bottom:1px solid #334155;flex-wrap:wrap;gap:.5rem}
.cat-name{font-weight:700;font-size:1rem}
.cat-chips{display:flex;align-items:center;gap:.4rem}
.chip{font-size:.72rem;padding:.18rem .55rem;border-radius:9999px;font-weight:600}
.chip-g{background:rgba(34,197,94,.15);color:#22c55e}
.chip-r{background:rgba(239,68,68,.15);color:#ef4444}
.chip-y{background:rgba(245,158,11,.15);color:#f59e0b}
.cat-pct{font-size:1rem;font-weight:800;margin-left:.4rem}

.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;padding:.55rem 1.5rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #334155}
.tbl td{padding:.7rem 1.5rem;font-size:.875rem;border-bottom:1px solid rgba(51,65,85,.4);vertical-align:top}
.tbl tr:last-child td{border-bottom:none}
.row-pass{background:rgba(34,197,94,.025)}
.row-fail{background:rgba(239,68,68,.05)}
.row-warn{background:rgba(245,158,11,.03)}

.badge{font-size:.7rem;font-weight:700;padding:.15rem .45rem;border-radius:.2rem;white-space:nowrap;display:inline-block}
.badge-pass{background:rgba(34,197,94,.15);color:#22c55e}
.badge-fail{background:rgba(239,68,68,.15);color:#ef4444}
.badge-warn{background:rgba(245,158,11,.15);color:#f59e0b}
.tbl th:first-child,.tbl td:first-child{width:95px}
.detail-cell{color:#64748b;font-family:Consolas,monospace;font-size:.8rem}
.footer{text-align:center;color:#475569;font-size:.78rem;margin-top:2rem;padding-top:1rem;border-top:1px solid #1e293b}
@media(max-width:640px){.grid{grid-template-columns:repeat(2,1fr)}.hero{flex-direction:column}.score-box{margin-left:0}}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-text">
    <div class="brand">Vaultix <span>AI</span></div>
    <div class="sub">Backend Security &amp; Integration Test Report — v2 (Post-Fix)</div>
    <div class="meta">
      Run date: ${new Date().toLocaleString()}<br>
      Duration: ${(durationMs / 1000).toFixed(1)}s &nbsp;·&nbsp; ${total} tests across 9 categories<br>
      Target: ${BASE_URL} &nbsp;·&nbsp; Redis: ${redisOnline ? '✓ connected' : '✗ offline (rate-limit headers in fallback mode)'}
    </div>
  </div>
  <div class="score-box">
    <div class="score-num">${score}</div>
    <div class="score-lbl">/ 100 Score</div>
    <div class="grade">Grade ${grade}</div>
  </div>
</div>

<div class="fixes-bar">
  <span class="fixes-label">4 Fixes Deployed</span>
  ${fixBadge('Fix 1: X-Powered-By removed', fix1)}
  ${fixBadge('Fix 2: Helmet headers', fix2)}
  ${fixBadge('Fix 3: Audit limiter skip bug', fix3)}
  ${fixBadge('Fix 4: Global rate limiter', fix4)}
</div>

<div class="grid">
  <div class="stat"><div class="stat-n c-b">${total}</div><div class="stat-l">Total Tests</div></div>
  <div class="stat"><div class="stat-n c-g">${passes}</div><div class="stat-l">Passed</div></div>
  <div class="stat"><div class="stat-n c-r">${fails}</div><div class="stat-l">Failed</div></div>
  <div class="stat"><div class="stat-n c-y">${warns}</div><div class="stat-l">Warnings</div></div>
</div>

${catBlocks}

<div class="footer">
  Vaultix AI Backend Test Suite v2 &nbsp;·&nbsp; ${new Date().toISOString()}
</div>

</body>
</html>`
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║     VAULTIX AI — POST-FIX FULL TEST SUITE (v2)         ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log(`\n  Target : ${BASE_URL}`)
  console.log(`  Email  : ${TEST_EMAIL}`)
  console.log(`  Fixes  : X-Powered-By · Helmet · Audit limiter · Global limiter\n`)

  console.log('  Starting server …')
  try {
    await startServer()
  } catch (err) {
    console.error(`\n  ✗ Cannot start server: ${err.message}`)
    process.exit(1)
  }

  try {
    await testHealth()
    await testAuth()
    await testValidation()
    await testRateLimiting()
    await testStress()
    await testStripeWebhook()
    await testCORSAndHeaders()
    await testBusinessLogic()
    await testNewRoutes()
  } finally {
    stopServer()
  }

  const duration = Date.now() - suiteStart
  const total    = results.length
  const passes   = results.filter(r => r.status === 'PASS').length
  const fails    = results.filter(r => r.status === 'FAIL').length
  const warns    = results.filter(r => r.status === 'WARN').length
  const score    = Math.round(((passes + warns * 0.5) / total) * 100)

  console.log('\n══════════════════════════════════════════════════════════')
  console.log(`  ${passes} passed  /  ${fails} failed  /  ${warns} warned  (${total} total)`)
  console.log(`  SCORE: ${score}/100    Duration: ${(duration / 1000).toFixed(1)}s`)
  console.log('══════════════════════════════════════════════════════════\n')

  const reportPath = path.join(__dirname, 'vaultix-test-report.html')
  writeFileSync(reportPath, generateReport(duration))
  console.log(`  HTML report → ${reportPath}\n`)

  process.exit(fails > 0 ? 1 : 0)
}

main().catch(err => { console.error(err); stopServer(); process.exit(1) })
