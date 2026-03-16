# MSW + msw-trpc — Handler Patterns

## Stack

- `msw` v2 — network-level interception
- `msw-trpc` — typed tRPC handlers derived from `AppRouter`

## Server Setup

```ts
// tests/_mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

```ts
// tests/_utils/setup.ts (global vitest setup file)
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { server } from '@tests/_mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
```

`onUnhandledRequest: 'error'` — forces every endpoint to be explicitly mocked.
Silent pass-throughs hide missing handlers.

## msw-trpc Setup

```ts
// tests/_mocks/handlers/index.ts
import { createTRPCMsw } from 'msw-trpc'
import type { AppRouter } from '@server/router'

export const trpcMsw = createTRPCMsw<AppRouter>()

export const handlers = [
  ...userHandlers,
  ...postHandlers,
]
```

```ts
// tests/_mocks/handlers/users.ts
import { trpcMsw } from './index'

export const userHandlers = [
  trpcMsw.user.list.query(() => [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob',   email: 'bob@example.com' },
  ]),

  trpcMsw.user.getById.query(({ input }) => ({
    id: input.id,
    name: 'Alice',
    email: 'alice@example.com',
  })),

  trpcMsw.user.create.mutation(({ input }) => ({
    id: '3',
    ...input,
  })),
]
```

## Per-Test Handler Override

Use `server.use()` to override for a single test. `resetHandlers()` in
`afterEach` cleans it up automatically.

```ts
it('shows error on server failure', async () => {
  server.use(
    trpcMsw.user.list.query(() => {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    })
  )
  // ...
})
```

## tRPC Error Codes in Handlers

```ts
import { TRPCError } from '@trpc/server'

trpcMsw.user.create.mutation(() => {
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'Email already exists',
  })
})
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`BAD_REQUEST`, `INTERNAL_SERVER_ERROR`, `TIMEOUT`.

## Simulating Refetch After Mutation

Use a call counter to return different data on successive calls:

```ts
let callCount = 0
server.use(
  trpcMsw.user.list.query(() => {
    callCount++
    return callCount === 1
      ? [{ id: '1', name: 'Alice' }]
      : [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]
  })
)
```

Reset `callCount` in `beforeEach` if reused across tests.
