/**
 * HTTP front for the marine cargo rating engine.
 *
 * Node standard library only. Serves the quote form from `public/` and two
 * JSON endpoints. Request bodies are never logged: a quote request can
 * describe a customer's shipment.
 */

import { createServer as createHttpServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BASE_RATES, CARGO_TYPES, COVERAGES, CURRENCY, DEDUCTIBLES, ROUTES,
  quote, validate,
} from './rating.js'

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const MAX_BODY_BYTES = 16 * 1024

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
}

export const OPTIONS = {
  currency: CURRENCY,
  transportMode: Object.fromEntries(Object.keys(BASE_RATES).map((k) => [k, { label: k[0].toUpperCase() + k.slice(1) }])),
  cargoType: CARGO_TYPES,
  route: ROUTES,
  coverage: COVERAGES,
  deductible: DEDUCTIBLES,
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    const tooLarge = Object.assign(new Error('Request body too large.'), { status: 413 })
    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
      req.resume()
      return reject(tooLarge)
    }
    const chunks = []
    let size = 0
    let done = false
    req.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        // Drain the rest so the 413 reaches the client over the open connection.
        done = true
        chunks.length = 0
        reject(tooLarge)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (done) return
      try {
        resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'))
      } catch {
        reject(Object.assign(new Error('Body must be valid JSON.'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

async function serveStatic(res, urlPath) {
  const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1)
  const file = resolve(PUBLIC_DIR, normalize(relative))
  const type = MIME[extname(file)]
  if (!file.startsWith(PUBLIC_DIR + '/') || !type) {
    return send(res, 404, { error: 'Not found.' })
  }
  try {
    send(res, 200, await readFile(file), type)
  } catch {
    send(res, 404, { error: 'Not found.' })
  }
}

async function handleQuote(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Use POST.' })
  }
  let body
  try {
    body = await readJsonBody(req)
  } catch (err) {
    return send(res, err.status || 400, { error: err.message })
  }
  const errors = validate(body)
  if (Object.keys(errors).length) {
    return send(res, 400, { error: 'Check the highlighted fields.', fields: errors })
  }
  return send(res, 200, quote(body))
}

export function createServer() {
  return createHttpServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    try {
      if (pathname === '/api/quote') return await handleQuote(req, res)
      if (pathname === '/api/options') return send(res, 200, OPTIONS)
      if (pathname === '/api/health') return send(res, 200, { ok: true })
      if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(res, pathname)
      return send(res, 404, { error: 'Not found.' })
    } catch {
      send(res, 500, { error: 'Something went wrong on our side.' })
    }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 5101
  createServer().listen(port, () => {
    console.log(`marine-cargo-quote listening on http://localhost:${port}`)
  })
}
