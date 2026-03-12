# tRPC Routers — Structure, Validation, Types & Client

---

## Router Organization

Structure routers by domain/feature, not by HTTP method:

```
src/routers/
  users.ts       -- User domain
  posts.ts       -- Post domain  
  admin.ts       -- Admin domain
  uploads.ts     -- File uploads
```

```typescript
// src/trpc/router.ts
import { router } from './init'
import { userRouter } from '../routers/users'
import { postRouter } from '../routers/posts'
import { adminRouter } from '../routers/admin'

export const appRouter = router({
  users: userRouter,
  posts: postRouter,
  admin: adminRouter,
})

// THE type export — this IS your API contract
export type AppRouter = typeof appRouter
```

---

## Input & Output Validation

**Always validate both.** Output validation documents your API contract and prevents accidental data leaks.

```typescript
import { z } from 'zod'
import { router } from '../trpc/init'
import { publicProcedure, protectedProcedure, adminProcedure } from '../trpc/procedures'
// Import drizzle-zod schemas from db-agent's zod.ts
import { insertPostSchema, selectPostSchema } from '../lib/db/zod'

// Extend drizzle-zod schemas if needed
const CreatePostInput = insertPostSchema.pick({
  title: true,
  content: true,
})

export const postRouter = router({
  // Public — anyone can read
  list: publicProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .output(z.object({
      posts: z.array(selectPostSchema),
      total: z.number(),
    }))
    .query(async ({ input }) => {
      return postService.list(input.page, input.limit)
    }),

  // Protected — must be signed in
  create: protectedProcedure
    .input(CreatePostInput)
    .output(selectPostSchema)
    .mutation(async ({ input, ctx }) => {
      ctx.logger.info('Creating post', { by: ctx.user.id })
      return postService.create(input, ctx.user.id)
    }),

  // Admin — must be admin
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return postService.delete(input.id)
    }),
})
```

### Key rules:
- Use drizzle-zod schemas from db-agent's `zod.ts` as base — don't duplicate
- Use `.pick()`, `.omit()`, `.extend()` to adapt for specific procedures
- `.output()` is mandatory — it prevents leaking internal fields to clients
- Zod validation errors auto-throw BAD_REQUEST via tRPC — they appear as zodError in the errorFormatter

---

## Type Export & Client Setup

tRPC's value proposition: zero-code-generation type safety. The `AppRouter` type IS the API contract.

```typescript
// Client — e.g., in your React app
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import type { AppRouter } from '../server/trpc/router'  // type-only import

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      transformer: superjson,  // MUST match server
      fetch: (url, options) => {
        // Include cookies for Better Auth session
        return fetch(url, { ...options, credentials: 'include' })
      },
    }),
  ],
})
```

### 100% type-safe calls:
```typescript
const user = await trpc.users.getById.query({ id: '123' })
//    ^? fully inferred from Zod output schema

// Client-side error handling
import { TRPCClientError } from '@trpc/client'

try {
  await trpc.posts.create.mutate({ title: '' })
} catch (err) {
  if (err instanceof TRPCClientError) {
    if (err.data?.code === 'UNAUTHORIZED') {
      // redirect to sign-in
    }
    if (err.data?.zodError) {
      // show field-level validation errors
      console.log(err.data.zodError.fieldErrors)
    }
  }
}
```

---

## Request Batching

tRPC auto-batches multiple concurrent calls into one HTTP request with httpBatchLink. No server configuration needed:

```typescript
// These 3 calls become 1 HTTP request automatically
const [user, posts, settings] = await Promise.all([
  trpc.users.me.query(),
  trpc.posts.list.query({ page: 1 }),
  trpc.settings.get.query(),
])
```

---

## Procedures Call Services — Never db Directly

```typescript
// WRONG - procedure imports db
.mutation(async ({ input }) => {
  return db.insert(posts).values(input).returning()  // NO
})

// RIGHT - procedure calls service function
.mutation(async ({ input, ctx }) => {
  return postService.create(input, ctx.user.id)  // YES
})
```

Service functions use tx/withTransaction (db-agent's domain). Procedures are thin orchestration wrappers.
