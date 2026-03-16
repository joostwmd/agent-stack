# tRPC Initialization — SuperJSON, Error Formatter, Context Bridge

---

## initTRPC Setup

```typescript
// src/trpc/init.ts
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({
  // tRPC v10: transformer here. tRPC v11: transformer moves to link level.
  transformer: superjson,

  errorFormatter({ shape, error, ctx }) {
    return {
      ...shape,
      data: {
        ...shape.data,

        // Expose Zod validation errors in structured, client-friendly format
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,

        // Always include requestId for debugging
        requestId: ctx?.requestId ?? null,

        // Only expose stack traces in development
        stack: process.env.NODE_ENV === 'development'
          ? error.stack
          : undefined,
      },
    }
  },
})

export { t }
export const router    = t.router
export const middleware = t.middleware
```

---

## SuperJSON — Why It Matters

By default tRPC uses plain JSON. This loses JavaScript-native types during serialization:

| Type | Plain JSON | With SuperJSON |
|------|-----------|----------------|
| Date | string (lost) | Date (preserved) |
| Map | lost entirely | Map (preserved) |
| Set | lost entirely | Set (preserved) |
| BigInt | throws error | BigInt (preserved) |
| undefined | omitted | undefined (preserved) |
| NaN / Infinity | null | preserved |
| RegExp | {} | RegExp (preserved) |

**Critical:** SuperJSON must be configured on BOTH server and client. Mismatched transformers cause silent data corruption.

### tRPC v10 vs v11

**v10 (current stable):** transformer is set in initTRPC.create()
```typescript
const t = initTRPC.context<Context>().create({
  transformer: superjson,
})
```

**v11:** transformer moves to the link level
```typescript
// Server: no transformer in create()
const t = initTRPC.context<Context>().create({})

// Client: transformer on the link
httpBatchLink({
  url: '/trpc',
  transformer: superjson,
})
```

---

## Error Formatter

The errorFormatter shapes ALL tRPC error responses globally. It runs on every error before the response is sent to the client.

### What it does:
1. Flattens Zod validation errors into fieldErrors/formErrors (client-friendly)
2. Attaches requestId for debugging/support tickets
3. Strips stack traces in production (security)

### Example error response the client receives:

```json
{
  "error": {
    "message": "Validation failed",
    "code": -32600,
    "data": {
      "code": "BAD_REQUEST",
      "httpStatus": 400,
      "requestId": "a1b2c3d4-...",
      "zodError": {
        "fieldErrors": {
          "email": ["Invalid email address"],
          "name": ["String must contain at least 1 character(s)"]
        },
        "formErrors": []
      },
      "stack": null
    }
  }
}
```

---

## Context Creation — The Bridge

This is the single handoff point from Hono to tRPC. Everything a procedure needs gets passed here:

```typescript
// src/trpc/context.ts
import type { Context as HonoContext } from 'hono'
import type { AppEnv } from '../types'

export async function createContext(c: HonoContext<AppEnv>) {
  return {
    // Auth — already resolved by Hono sessionMiddleware, no async call
    user:      c.get('user'),
    session:   c.get('session'),

    // Observability
    logger:    c.get('logger'),
    requestId: c.get('requestId'),

    // Database
    db:        db,

    // Raw headers (if needed)
    headers:   c.req.raw.headers,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
```

### Key points:
- user/session are already resolved (Hono sessionMiddleware did the work)
- No async auth calls here — just passing through pre-resolved data
- The `Context` type is inferred from the return — tRPC procedures get full type safety
- Mount tRPC with: `createContext: (_opts, c) => createContext(c)`

---

## Mounting tRPC on Hono

```typescript
import { trpcServer } from '@hono/trpc-server'

app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: (_opts, c) => createContext(c),
  onError({ error, path, type, ctx }) {
    // Centralized error logging — see observability.md
  },
}))
```

The endpoint path in trpcServer must match the middleware path pattern (`/trpc/*`).
