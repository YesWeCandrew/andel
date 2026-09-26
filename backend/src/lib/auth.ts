// src/lib/auth.ts
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fastifyCookie from '@fastify/cookie'

// Single shared password, set as a Fly runtime secret
// (`fly secrets set APP_PASSWORD=...`) — never committed or baked into the image.
const PASSWORD = process.env.APP_PASSWORD

const COOKIE_NAME = 'andel_auth'
const COOKIE_MAX_AGE_S = 180 * 24 * 60 * 60
// Re-issue the cookie once it's past half its lifetime, so regular use never
// hits the Basic auth prompt again.
const COOKIE_REFRESH_AFTER_S = COOKIE_MAX_AGE_S / 2

// Constant-time compare of two strings of arbitrary length: hashing first
// gives timingSafeEqual the equal-length buffers it requires.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

// The cookie is `<expiry>.<hmac>` with the HMAC keyed on the password itself,
// so rotating APP_PASSWORD invalidates every issued cookie — that's the
// "lock everyone out" lever.
function sign(password: string, expiry: number): string {
  return createHmac('sha256', password).update(`andel-auth:${expiry}`).digest('base64url')
}

function makeCookie(password: string): string {
  const expiry = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_S
  return `${expiry}.${sign(password, expiry)}`
}

/** Returns the cookie's expiry (unix seconds) if it's valid and unexpired, else null. */
function verifyCookie(password: string, value: string | undefined): number | null {
  if (!value) return null
  const [expiryStr, mac] = value.split('.')
  const expiry = Number(expiryStr)
  if (!mac || !Number.isInteger(expiry) || expiry <= Date.now() / 1000) return null
  return safeEqual(mac, sign(password, expiry)) ? expiry : null
}

/** The password from an `Authorization: Basic ...` header (username is ignored). */
function basicAuthPassword(header: string | undefined): string | null {
  if (!header?.startsWith('Basic ')) return null
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const sep = decoded.indexOf(':')
  return sep === -1 ? null : decoded.slice(sep + 1)
}

function setAuthCookie(reply: FastifyReply, password: string) {
  reply.setCookie(COOKIE_NAME, makeCookie(password), {
    path: '/',
    maxAge: COOKIE_MAX_AGE_S,
    httpOnly: true,
    // Safari won't store Secure cookies over plain-http localhost, so only
    // require it in production (where Fly forces HTTPS).
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

/**
 * Guards every route (API, uploads, and the SPA itself). A valid auth cookie
 * lets the request through; otherwise the browser's native Basic auth prompt
 * is used once, and a successful login is swapped for a long-lived cookie —
 * iOS home-screen apps don't reliably keep Basic auth credentials between launches.
 *
 * Must be called on the root instance, before any routes are registered.
 */
export function registerAuth(app: FastifyInstance) {
  if (!PASSWORD) {
    // Fail closed: never serve production without a password.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('APP_PASSWORD is not set — refusing to start without authentication')
    }
    app.log.warn('APP_PASSWORD is not set — authentication is disabled (development only)')
    return
  }
  const password = PASSWORD

  // Plugins load in registration order, so wrapping the hook in a plugin
  // after the cookie plugin guarantees `request.cookies` is parsed by the time
  // it runs. skip-override (what fastify-plugin sets) keeps the hook on the
  // root instance rather than encapsulated, so it applies to every route.
  app.register(fastifyCookie)
  const guard = async (instance: FastifyInstance) => {
    instance.addHook('onRequest', (request, reply) => checkAuth(password, request, reply))
  }
  Object.assign(guard, { [Symbol.for('skip-override')]: true })
  app.register(guard)
}

async function checkAuth(password: string, request: FastifyRequest, reply: FastifyReply) {
  const expiry = verifyCookie(password, request.cookies[COOKIE_NAME])
  if (expiry !== null) {
    if (expiry - Date.now() / 1000 < COOKIE_REFRESH_AFTER_S) setAuthCookie(reply, password)
    return
  }

  const attempt = basicAuthPassword(request.headers.authorization)
  if (attempt !== null && safeEqual(attempt, password)) {
    setAuthCookie(reply, password)
    return
  }

  reply
    .code(401)
    .header('WWW-Authenticate', 'Basic realm="Andel", charset="UTF-8"')
    .send({ message: 'Authentication required' })
  return reply
}
