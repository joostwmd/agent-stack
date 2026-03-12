# tRPC Error Handling — Patterns & errorMapperMiddleware

Error handling spans two layers. Understand which layer catches what.

---

## Error Handling Layers

| Layer | Catches | Tool |
|-------|---------|------|
| **Hono** app.onError() | HTTPException, ZodError from Hono validators, unhandled non-tRPC errors | app.onError() |
| **tRPC** errorFormatter | ALL tRPC errors — shapes the response (adds zodError, requestId) | errorFormatter in initTRPC |
| **tRPC** errorMapperMiddleware | Domain errors from service/db layer — maps to TRPCError | t.middleware() |
| **tRPC** onError callback | Observability hook — logs errors, sends to Sentry | onError in trpcServer() |

**Critical:** tRPC errors do NOT bubble to app.onError(). They are handled entirely within tRPC's pipeline.

---

## errorMapperMiddleware — Centralized Domain Error Mapping

Instead of mapping domain errors in every procedure, use a single middleware that wraps all procedures:

```typescript
// src/trpc/middleware/errorMapper.ts
import { TRPCError } from '@trpc/server'
import { middleware } from '../init'
import {
  UniqueViolationError,
  ForeignKeyViolationError,
  NotNullViolationError,
  CheckViolationError,
  SerializationError,
  DeadlockError,
  QueryTimeoutError,
  ConnectionError,
  DatabaseError,
} from '../../lib/db/errors'

export const errorMapperMiddleware = middleware(async ({ next }) => {
  try {
    return await next()
  } catch (err) {
    // Already a TRPCError — pass through (from auth middleware, manual throws, etc.)
    if (err instanceof TRPCError) throw err

    // Database domain errors (from db-agent's dbSafe/withTransaction)
    if (err instanceof UniqueViolationError) {
      throw new TRPCError({
        code: 'CONFLICT',                    // 409
        message: err.message,
        cause: err,
      })
    }

    if (err instanceof ForeignKeyViolationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',                 // 400
        message: 'Referenced record does not exist',
        cause: err,
      })
    }

    if (err instanceof NotNullViolationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',                 // 400
        message: err.message,
        cause: err,
      })
    }

    if (err instanceof CheckViolationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',                 // 400
        message: 'Data validation failed at database level',
        cause: err,
      })
    }

    if (err instanceof SerializationError || err instanceof DeadlockError) {
      throw new TRPCError({
        code: 'CONFLICT',                    // 409
        message: 'Transaction conflict — please retry',
        cause: err,
      })
    }

    if (err instanceof QueryTimeoutError) {
      throw new TRPCError({
        code: 'TIMEOUT',                     // 408
        message: 'Database query timed out',
        cause: err,
      })
    }

    if (err instanceof ConnectionError || err instanceof DatabaseError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',       // 500
        message: 'A database error occurred',
        cause: err,
      })
    }

    // Application-level domain errors (add your own)
    // if (err instanceof InsufficientCreditsError) {
    //   throw new TRPCError({ code: 'PRECONDITION_FAILED', message: err.message, cause: err })
    // }

    // Unknown error — let it surface as 500
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: err,
    })
  }
})
```

### Where it sits in the middleware chain:

```typescript
export const publicProcedure = t.procedure
  .use(logMiddleware)           // 1. Log the call
  .use(errorMapperMiddleware)   // 2. Catch domain errors from service layer
  // isAuthenticated, isAdmin etc. are added on top for protected procedures
```

---

## Error Handling Patterns in Procedures

### Pattern 1: Let errorMapperMiddleware handle it (preferred)

```typescript
// The service throws UniqueViolationError -> errorMapperMiddleware maps to CONFLICT
create: protectedProcedure
  .input(CreatePostInput)
  .output(PostSchema)
  .mutation(async ({ input, ctx }) => {
    return postService.create(input, ctx.user.id)
    // If postService throws UniqueViolationError, errorMapperMiddleware catches it
  }),
```

### Pattern 2: Manual TRPCError for business logic

```typescript
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .output(PostSchema)
  .query(async ({ input }) => {
    const post = await postService.findById(input.id)
    if (!post) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Post ${input.id} not found`,
      })
    }
    return post
  }),
```

### Pattern 3: Wrapping with cause (for debugging)

```typescript
publish: verifiedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      return await postService.publish(input.id, ctx.user.id)
    } catch (err) {
      if (err instanceof TRPCError) throw err  // pass through

      if (err instanceof InsufficientCreditsError) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',    // 412
          message: 'Not enough credits to publish',
          cause: err,                      // preserved in Sentry
        })
      }

      throw err  // unknown -> errorMapperMiddleware catches it
    }
  }),
```

---

## onError Callback — Observability Hook

```typescript
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: (_opts, c) => createContext(c),
  onError({ error, path, type, ctx }) {
    // Log every tRPC error
    ctx?.logger?.error('tRPC error', {
      path,
      type,
      code: error.code,
      message: error.message,
    })

    // Report 500s to Sentry
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

## Hono Error Handler (Non-tRPC Errors Only)

```typescript
app.onError((err, c) => {
  const log = c.get('logger')

  // Known HTTP errors (thrown intentionally in Hono middleware)
  if (err instanceof HTTPException) {
    log?.warn('HTTP error', { status: err.status, message: err.message })
    return err.getResponse()
  }

  // Zod errors from Hono-level validators (NOT from tRPC .input())
  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', issues: err.flatten() }, 400)
  }

  // Unknown 500
  log?.error('Unhandled error', { error: err.message, stack: err.stack })
  Sentry.captureException(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

---

## Complete Error Flow

```
Service throws UniqueViolationError
     |
     v
errorMapperMiddleware catches it
     |
     v
throws new TRPCError({ code: 'CONFLICT', cause: originalError })
     |
     v
errorFormatter shapes the response (adds requestId, zodError: null)
     |
     v
onError fires (logs error, skips Sentry because not 500)
     |
     v
Client receives: { error: { data: { code: 'CONFLICT', httpStatus: 409, requestId: '...' } } }
```

```
Service throws unknown Error
     |
     v
errorMapperMiddleware catches it
     |
     v
throws new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: originalError })
     |
     v
errorFormatter shapes the response (strips stack in prod)
     |
     v
onError fires (logs error, sends to Sentry because 500)
     |
     v
Client receives: { error: { data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, requestId: '...' } } }
```
