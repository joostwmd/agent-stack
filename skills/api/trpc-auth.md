# tRPC Auth Middleware — Enforcement Layer

Auth enforcement happens at the tRPC layer, NOT at Hono. Hono's sessionMiddleware extracts the session; tRPC middleware asserts it exists and narrows TypeScript types.

---

## The Two Layers Explained

| Layer | Does | Example |
|-------|------|---------|
| **Hono** sessionMiddleware | Extracts session from cookies, sets ctx.user (or null) | "Who is making this request?" |
| **tRPC** isAuthenticated | Asserts ctx.user is non-null, throws UNAUTHORIZED if not | "Are they allowed to do this?" |

Why separate? Because publicProcedure routes don't require auth. If you reject unauthenticated users at Hono, public procedures become inaccessible.

---

## Auth Middleware Implementations

```typescript
// src/trpc/middleware/auth.ts
import { TRPCError } from '@trpc/server'
import { middleware } from '../init'

/**
 * isAuthenticated
 *
 * Asserts that the user is signed in.
 * - Reads ctx.user (populated by Hono sessionMiddleware via Better Auth)
 * - Does NOT call Better Auth again — zero extra async work
 * - Narrows TypeScript type: ctx.user goes from User | null -> User
 */
export const isAuthenticated = middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',        // -> HTTP 401
      message: 'You must be signed in to access this resource',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,       // TypeScript narrows: User | null -> User
      session: ctx.session,  // TypeScript narrows: Session | null -> Session
    },
  })
})

/**
 * isAdmin
 *
 * Chains on isAuthenticated — user is guaranteed non-null.
 * Uses unstable_pipe to compose middleware sequentially.
 */
export const isAdmin = isAuthenticated.unstable_pipe(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',           // -> HTTP 403
      message: 'This action requires admin privileges',
      cause: new Error(`User ${ctx.user.id} attempted admin action`),
    })
  }
  return next({ ctx })
})

/**
 * isVerified
 *
 * Asserts the user's email has been verified.
 * Useful for gating content creation, purchases, etc.
 */
export const isVerified = isAuthenticated.unstable_pipe(({ ctx, next }) => {
  if (!ctx.user.emailVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',           // -> HTTP 403
      message: 'Please verify your email address before continuing',
    })
  }
  return next({ ctx })
})

/**
 * hasRole — dynamic role-checking middleware factory
 *
 * Usage: protectedProcedure.use(hasRole('editor'))
 */
export function hasRole(requiredRole: string) {
  return isAuthenticated.unstable_pipe(({ ctx, next }) => {
    if (ctx.user.role !== requiredRole) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires the "${requiredRole}" role`,
      })
    }
    return next({ ctx })
  })
}
```

---

## How TRPCError Works in Middleware

When you throw `new TRPCError(...)` in a middleware:

```
throw new TRPCError({ code: 'FORBIDDEN' })
     |
     v
errorFormatter() -- adds requestId, zodError, strips stack in prod
     |
     v
onError() -- logs to structured logger, reports to Sentry if 500
     |
     v
Client receives: { error: { data: { code: 'FORBIDDEN', httpStatus: 403, ... } } }
```

It does NOT crash the server. tRPC catches it internally and routes it through the error pipeline.

---

## Composable Procedure Bases

```typescript
// src/trpc/procedures.ts
import { t } from './init'
import { logMiddleware } from './middleware/logger'
import { errorMapperMiddleware } from './middleware/errorMapper'
import { isAuthenticated, isAdmin, isVerified } from './middleware/auth'

// Every procedure gets logging + domain error mapping
export const publicProcedure = t.procedure
  .use(logMiddleware)
  .use(errorMapperMiddleware)

// Must be signed in
export const protectedProcedure = publicProcedure
  .use(isAuthenticated)

// Must be signed in + email verified
export const verifiedProcedure = protectedProcedure
  .use(isVerified)

// Must be signed in + admin role
export const adminProcedure = protectedProcedure
  .use(isAdmin)
```

### Usage in routers:

```typescript
export const postRouter = router({
  list:    publicProcedure.query(/* ... */),        // Anyone
  create:  protectedProcedure.mutation(/* ... */),   // Signed in
  publish: verifiedProcedure.mutation(/* ... */),     // Verified email
  delete:  adminProcedure.mutation(/* ... */),        // Admin only
})
```

---

## tRPC Error Code Reference

| tRPC Code | HTTP | When to Use |
|-----------|------|-------------|
| BAD_REQUEST | 400 | Invalid input (also auto-thrown by Zod) |
| UNAUTHORIZED | 401 | Not signed in / session expired |
| FORBIDDEN | 403 | Signed in but lacking permission/role |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | Duplicate / state conflict |
| PRECONDITION_FAILED | 412 | Business rule violation |
| UNPROCESSABLE_CONTENT | 422 | Semantic validation failure |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server failure |

---

## Better Auth Integration Notes

- Auth instance setup (betterAuth config, plugins, session options) is **auth-agent's domain**
- This agent only consumes the `auth` instance and its inferred types
- Session/User types come from `typeof auth.$Infer.Session.user` — never duplicate manually
- auth.api.getSession() is called in Hono sessionMiddleware, NOT in tRPC middleware
