# Hono Middleware Pipeline

Hono is the HTTP transport layer. It handles routing, middleware, request/response lifecycle, and hosts the tRPC adapter.

---

## Middleware Ordering (Critical)

Order matters. This is the production sequence:

```typescript
// src/app.ts
import './instrument'                    // 1. Sentry — MUST be first import

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { trpcServer } from '@hono/trpc-server'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import * as Sentry from '@sentry/node'

import { auth } from './lib/auth'
import { requestLogger } from './middleware/logger'
import { sessionMiddleware } from './middleware/session'
import { sentryUserContext } from './middleware/sentry'
import { appRouter } from './trpc/router'
import { createContext } from './trpc/context'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

// 1. Security headers
app.use('*', secureHeaders())

// 2. CORS — credentials: true is REQUIRED for Better Auth cookies
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// 3. Better Auth routes — BEFORE sessionMiddleware
//    These are auth's own endpoints (sign-in, sign-up, sign-out, etc.)
//    Auth-agent owns the auth instance config; api-agent just mounts it
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// 4. Request logging — attach requestId + structured logger
app.use('*', requestLogger)

// 5. Session extraction — one getSession call per request
app.use('*', sessionMiddleware)

// 6. Sentry user context
app.use('*', sentryUserContext)

// 7. tRPC — all procedure logic inside
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: (_opts, c) => createContext(c),
  onError({ error, path, type, ctx }) {
    ctx?.logger?.error('tRPC error', {
      path, type, code: error.code, message: error.message,
    })
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      Sentry.captureException(error, {
        tags: { trpcPath: path, trpcType: type },
        extra: { requestId: ctx?.requestId },
      })
    }
  },
}))

// 8. Health/operational endpoints (outside tRPC)
app.get('/healthz', (c) => c.json({ status: 'ok', uptime: process.uptime() }))
app.get('/readyz', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({ status: 'ready' })
  } catch {
    return c.json({ status: 'not ready' }, 503)
  }
})

// 9. Global error handler — non-tRPC errors ONLY
app.onError((err, c) => {
  const log = c.get('logger')

  if (err instanceof HTTPException) {
    log?.warn('HTTP error', { status: err.status, message: err.message })
    return err.getResponse()
  }

  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', issues: err.flatten() }, 400)
  }

  log?.error('Unhandled error', { error: err.message, stack: err.stack })
  Sentry.captureException(err, {
    extra: { path: c.req.path, method: c.req.method, requestId: c.get('requestId') },
  })
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 10. 404
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

export default app
```

---

## CORS Configuration

```typescript
// src/middleware/security.ts
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

export const corsMiddleware = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,  // REQUIRED — Better Auth uses cookies
})

export const headersMiddleware = secureHeaders()
```

**credentials: true is mandatory.** Better Auth relies on cookies for session management. Without this, cross-origin requests silently fail to send the session cookie.

---

## Request Logging (Structured)

```typescript
// src/middleware/logger.ts
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

export const requestLogger = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)

  const log = createLogger({
    requestId,
    path: c.req.path,
    method: c.req.method,
  })
  c.set('logger', log)

  const start = Date.now()
  log.info('Request started')

  await next()

  log.info('Request completed', {
    status: c.res.status,
    durationMs: Date.now() - start,
  })
})
```

This logger instance passes into tRPC context — every procedure gets a per-request logger for free.

---

## Session Extraction Middleware (Better Auth)

```typescript
// src/middleware/session.ts
import { createMiddleware } from 'hono/factory'
import { auth } from '../lib/auth'
import type { AppEnv } from '../types'

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,  // Better Auth reads its own session cookie
  })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
  } else {
    c.set('user', session.user)
    c.set('session', session.session)
  }

  await next()
})
```

**This does NOT enforce auth.** It just populates context. tRPC middleware (isAuthenticated) does enforcement. If you reject here, public procedures break.

---

## AppEnv Types

```typescript
// src/types.ts
import type { auth } from './lib/auth'

export type AppEnv = {
  Variables: {
    user:      typeof auth.$Infer.Session.user    | null
    session:   typeof auth.$Infer.Session.session  | null
    requestId: string
    logger:    Logger
  }
}
```

Uses Better Auth's inferred types — zero manual type duplication.

---

## Hono Error Handling — Key Rule

**tRPC errors do NOT reach app.onError().** tRPC handles its own errors internally (errorFormatter -> onError callback -> serialized response). Hono's app.onError() only catches:
- HTTPException thrown in Hono middleware
- ZodError from Hono-level validators (not tRPC .input())
- Unhandled errors from non-tRPC routes

---

## Health Endpoints

Keep operational endpoints outside tRPC — they're simple HTTP, not RPC:
- `/healthz` — basic liveness (no dependencies)
- `/readyz` — readiness (checks DB connectivity)
