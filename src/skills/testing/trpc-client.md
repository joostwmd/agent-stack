# Client tRPC Setup — createTRPCClient + createTRPCOptionsProxy

## Pattern Overview

tRPC v11 with `@trpc/tanstack-react-query` uses:

1. **createTRPCClient** — vanilla HTTP client with `httpBatchLink`
2. **createTRPCOptionsProxy** — proxy that combines client + QueryClient for TanStack Query
3. **Router context** — `trpc` and `queryClient` passed via `RouterAppContext` for TanStack Router

Components use `trpc.user.list.useQuery()` (or `useQuery(trpc.user.list.queryOptions(...))`)
via the proxy. The proxy needs both the client (for fetching) and the QueryClient (for caching).

---

## Production Setup

```ts
// src/utils/trpc.ts (or packages/client/src/utils/trpc.ts)
import type { AppRouter } from '@repo/api/routers/index'
import { env } from '@repo/env/web'
import { QueryCache, QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error.message, {
        action: {
          label: 'retry',
          onClick: () => query.invalidate(),
        },
      })
    },
  }),
})

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.VITE_SERVER_URL}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        })
      },
    }),
  ],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
})
```

### Key Points

- **credentials: 'include'** — sends cookies with every request (session auth)
- **QueryCache onError** — global error handling with toast + retry
- **createTRPCOptionsProxy** — from `@trpc/tanstack-react-query`; provides `useQuery`/`useMutation` via options

---

## TanStack Router Context

If the app uses TanStack Router with `createRootRouteWithContext`:

```ts
// src/routes/__root.tsx
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'
import type { trpc } from '@/utils/trpc'

export interface RouterAppContext {
  trpc: typeof trpc
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  // ...
})
```

Components access `trpc` via `Route.useRouteContext().trpc` or by importing from `@/utils/trpc`.

---

## Test Setup — trpc-client for Tests

Create a test-specific trpc client that hits MSW. MSW intercepts `fetch` globally, so the URL must match what MSW expects. Use a base URL that MSW handlers will intercept (e.g. `http://localhost` or the path your handlers use).

```ts
// tests/_utils/trpc-client.ts
import type { AppRouter } from '@repo/api/routers/index'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

const TEST_TRPC_URL = 'http://localhost/trpc' // MSW intercepts this path

export function createTestTrpc() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })

  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: TEST_TRPC_URL,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          })
        },
      }),
    ],
  })

  const trpc = createTRPCOptionsProxy<AppRouter>({
    client: trpcClient,
    queryClient,
  })

  return { trpc, queryClient, trpcClient }
}
```

**Note:** The exact `TEST_TRPC_URL` may vary. Check `project-context` or MSW server config. MSW intercepts by request URL; msw-trpc handlers match tRPC procedure paths under the base.

---

## Test AllProviders — Wiring trpc + queryClient

Component tests need both `QueryClientProvider` and `trpc` in scope. If components import `trpc` from `@/utils/trpc`, the test setup must provide a trpc that hits MSW.

```ts
// tests/_utils/react.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { createTestTrpc } from './trpc-client'

// Per-test: create fresh trpc + queryClient so each test is isolated
function AllProviders({ children }: { children: React.ReactNode }) {
  const { trpc, queryClient } = createTestTrpc()
  return (
    <QueryClientProvider client={queryClient}>
      {/* If app uses React context for trpc, add TrpcProvider here */}
      {children}
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  return render(ui, { wrapper: AllProviders, ...options })
}
```

**If components get trpc from TanStack Router context:** Create a router with test context:

```ts
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { createTestTrpc } from '@tests/_utils/trpc-client'

function createTestRouter() {
  const { trpc, queryClient } = createTestTrpc()
  const history = createMemoryHistory()
  return createRouter({
    routeTree,
    history,
    context: { trpc, queryClient },
  })
}

// In test:
const router = createTestRouter()
renderWithProviders(<RouterProvider router={router} />)
```

---

## Mixing tRPC and useQuery (Better Auth, etc.)

Some pages use `useQuery` with non-tRPC fetchers (e.g. Better Auth `authClient.organization.list`). That is fine — they don't need the trpc proxy. Only components that call `trpc.*.useQuery()` or `trpc.*.useMutation()` need it.

---

## Summary

| File | Purpose |
|------|---------|
| `src/utils/trpc.ts` | Production: trpcClient, queryClient, trpc |
| `tests/_utils/trpc-client.ts` | Test: createTestTrpc() — same structure, URL for MSW |
| `tests/_utils/react.tsx` | AllProviders with createTestTrpc() |

**Rule:** Never mock `fetch` or tRPC — MSW intercepts at the network layer. The test trpc client uses the same `httpBatchLink` + `fetch`; MSW handles the rest.
