# Component Testing — RTL + msw-trpc

## Setup

Load `trpc-client.md` for the full tRPC client pattern (prod, test, MSW, RouterAppContext). Summary for component tests:

```ts
// tests/_utils/react.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { createTestTrpc } from './trpc-client'

function AllProviders({ children }: { children: React.ReactNode }) {
  const { queryClient } = createTestTrpc()
  return (
    <QueryClientProvider client={queryClient}>
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

**Components that import `trpc` directly:** Need the same `trpc` instance as the one whose client hits MSW. Either (a) have components consume `trpc` from React context in prod too, or (b) use a test-only barrel that re-exports `createTestTrpc().trpc` when `import.meta.env.TEST`. See `trpc-client.md` for the full pattern.

**Components that use `Route.useRouteContext().trpc`:** Create a router with test context and use `RouterProvider` — see `trpc-client.md` § "Test AllProviders — Wiring trpc + queryClient".

## Basic Pattern

```ts
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/_utils/react'
import { server } from '@tests/_mocks/server'
import { trpcMsw } from '@tests/_mocks/handlers'
import { UserList } from '@client/features/users/UserList'

it('renders user list', async () => {
  renderWithProviders(<UserList />)
  expect(await screen.findByText('Alice')).toBeInTheDocument()
})
```

## State Coverage Pattern

Every component test file must cover all states from `01-ui-spec.md`:

```ts
describe('UserList', () => {
  it('shows skeleton while loading')      // loading state
  it('renders users on success')          // success state
  it('shows empty state when no users')   // empty state
  it('shows error message on failure')    // error state
})
```

### Loading State

```ts
it('shows skeleton while loading', () => {
  // Don't await — assert immediately before data resolves
  renderWithProviders(<UserList />)
  // Query by role (e.g. status, progressbar) — never getByTestId
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

### Empty State

```ts
it('shows empty state when no users', async () => {
  server.use(
    trpcMsw.user.list.query(() => [])
  )
  renderWithProviders(<UserList />)
  expect(await screen.findByText(/no users yet/i)).toBeInTheDocument()
})
```

### Error State

```ts
it('shows error message on failure', async () => {
  server.use(
    trpcMsw.user.list.query(() => {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
    })
  )
  renderWithProviders(<UserList />)
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
})
```

## Query Priority

```
getByRole('button', { name: /submit/i })    ← always first
getByLabelText(/email/i)                    ← for form fields
getByPlaceholderText(/search/i)             ← when no label
getByText(/some content/i)                  ← non-interactive text
getByTestId(...)                            ← NEVER — flag a11y problem instead
```

## Async Rules

```ts
// WRONG — synchronous assertion after interaction
await userEvent.click(button)
expect(screen.getByText('Done')).toBeInTheDocument()

// CORRECT — findBy waits
await userEvent.click(button)
expect(await screen.findByText('Done')).toBeInTheDocument()

// CORRECT — waitFor for disappearance
await waitFor(() =>
  expect(screen.queryByText('Loading')).not.toBeInTheDocument()
)
```

## userEvent Setup

Always use `userEvent.setup()` — not the deprecated `userEvent` directly:

```ts
const user = userEvent.setup()
await user.type(screen.getByLabelText(/name/i), 'Alice')
await user.click(screen.getByRole('button', { name: /submit/i }))
```
