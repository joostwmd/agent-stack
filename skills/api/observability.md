# Observability — Sentry + Structured Logging

---

## Sentry Setup — HTTP Layer

### Step 1: Initialize FIRST (before all other imports)

```typescript
// src/instrument.ts
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  profileSessionSampleRate: 1.0,
  enableLogs: true,
  sendDefaultPii: true,
  integrations: [nodeProfilingIntegration()],
})
```

```typescript
// src/app.ts — MUST be first import
import './instrument'
import { Hono } from 'hono'
// ... rest of app
```

For ESM, use Node's --import flag:
```bash
node --import ./instrument.mjs app.mjs
```

### Step 2: Bind user to Sentry scope (after session extraction)

```typescript
// src/middleware/sentry.ts
import * as Sentry from '@sentry/node'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

export const sentryUserContext = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user')
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email })
  }

  await next()

  // Clear to prevent leaking between requests
  Sentry.setUser(null)
})
```

### Step 3: Capture errors in app.onError

```typescript
app.onError((err, c) => {
  if (!(err instanceof HTTPException) || err.status >= 500) {
    Sentry.captureException(err, {
      extra: {
        path: c.req.path,
        method: c.req.method,
        requestId: c.get('requestId'),
      },
    })
  }
  // ... rest of error handler
})
```

---

## Sentry Setup — tRPC Layer

### onError hook for procedure errors

```typescript
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: (_opts, c) => createContext(c),
  onError({ error, path, type, ctx }) {
    ctx?.logger?.error('tRPC error', {
      path, type, code: error.code, message: error.message,
    })

    // Only report 500s to Sentry — 4xx are expected/handled
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      Sentry.captureException(error, {
        tags: { trpcPath: path, trpcType: type },
        extra: { requestId: ctx?.requestId },
      })
    }
  },
}))
```

---

## tRPC Logging Middleware

```typescript
// src/trpc/middleware/logger.ts
import { middleware } from '../init'

export const logMiddleware = middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now()
  ctx.logger?.info('tRPC procedure started', { path, type })

  const result = await next()

  const durationMs = Date.now() - start

  if (result.ok) {
    ctx.logger?.info('tRPC procedure succeeded', { path, type, durationMs })
  } else {
    ctx.logger?.warn('tRPC procedure failed', { path, type, durationMs })
  }

  return result
})
```

---

## Request-Scoped Structured Logger

See hono-middleware.md for the full requestLogger implementation. Key points:
- Every request gets a unique requestId (crypto.randomUUID())
- Logger is bound to requestId, path, method
- Passed into tRPC context via createContext
- Available in procedures as ctx.logger
- requestId is included in errorFormatter responses for debugging

---

## Cloudflare Workers

Use @sentry/cloudflare instead of @sentry/node:

```typescript
import * as Sentry from '@sentry/cloudflare'
import app from './app'

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  app
)
```

The old @hono/sentry (toucan-js-based) community middleware is deprecated.
