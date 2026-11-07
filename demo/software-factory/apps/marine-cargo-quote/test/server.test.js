import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from '../src/server.js'

let server
let origin

before(async () => {
  server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

const valid = {
  cargoValue: 1_000_000,
  transportMode: 'sea',
  cargoType: 'general',
  route: 'asia',
  coverage: 'icc_a',
  deductible: 'none',
}

function post(path, body, headers = { 'Content-Type': 'application/json' }) {
  return fetch(origin + path, { method: 'POST', headers, body })
}

test('GET / serves the quote form with security headers', async () => {
  const res = await fetch(origin + '/')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/)
  const html = await res.text()
  assert.match(html, /<form id="quote-form"/)
  assert.match(html, /Marine cargo/)
})

test('static assets are served and the public folder cannot be escaped', async () => {
  assert.equal((await fetch(origin + '/app.js')).status, 200)
  assert.equal((await fetch(origin + '/styles.css')).status, 200)
  assert.equal((await fetch(origin + '/../package.json')).status, 404)
  assert.equal((await fetch(origin + '/%2e%2e/package.json')).status, 404)
  assert.equal((await fetch(origin + '/missing.html')).status, 404)
  assert.equal((await fetch(origin + '/index.txt')).status, 404)
})

test('GET /api/options lists the choices the form offers', async () => {
  const res = await fetch(origin + '/api/options')
  assert.equal(res.status, 200)
  const options = await res.json()
  assert.equal(options.currency, 'AED')
  assert.deepEqual(Object.keys(options.transportMode), ['sea', 'air', 'road'])
  assert.equal(options.coverage.icc_a.label, 'ICC (A) - all risks')
})

test('POST /api/quote prices a valid request', async () => {
  const res = await post('/api/quote', JSON.stringify(valid))
  assert.equal(res.status, 200)
  const q = await res.json()
  assert.equal(q.referral, false)
  assert.equal(q.total, 3517.5)
})

test('POST /api/quote returns a referral for risks it cannot price', async () => {
  const res = await post('/api/quote', JSON.stringify({ ...valid, cargoValue: 75_000_000 }))
  assert.equal(res.status, 200)
  const q = await res.json()
  assert.equal(q.referral, true)
  assert.equal(q.total, undefined)
})

test('POST /api/quote rejects bad input with field errors', async () => {
  const res = await post('/api/quote', JSON.stringify({ ...valid, cargoValue: 'a lot', route: 'moon' }))
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.deepEqual(Object.keys(body.fields).sort(), ['cargoValue', 'route'])
})

test('POST /api/quote rejects malformed and oversized bodies', async () => {
  assert.equal((await post('/api/quote', '{not json')).status, 400)
  assert.equal((await post('/api/quote', JSON.stringify(['x']))).status, 400)
  const huge = JSON.stringify({ ...valid, note: 'x'.repeat(20_000) })
  assert.equal((await post('/api/quote', huge)).status, 413)
})

test('other methods and unknown routes are refused', async () => {
  const get = await fetch(origin + '/api/quote')
  assert.equal(get.status, 405)
  assert.equal(get.headers.get('allow'), 'POST')
  assert.equal((await fetch(origin + '/api/nope')).status, 404)
  assert.equal((await fetch(origin + '/', { method: 'DELETE' })).status, 404)
  assert.deepEqual(await (await fetch(origin + '/api/health')).json(), { ok: true })
})
