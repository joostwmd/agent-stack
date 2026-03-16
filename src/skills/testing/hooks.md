# Custom Hook Testing — renderHook

## Setup

Always wrap with `AllProviders` — hooks using `useQuery` or `useMutation`
need the `QueryClient`:

```ts
import { renderHook, waitFor } from '@testing-library/react'
import { AllProviders } from '@tests/_utils/react'
```

## Basic Pattern

```ts
import { renderHook, waitFor } from '@testing-library/react'
import { AllProviders } from '@tests/_utils/react'
import { useUser } from '@client/features/users/hooks/useUser'

it('fetches and returns user data', async () => {
  const { result } = renderHook(() => useUser('1'), {
    wrapper: AllProviders,
  })

  // Initial state
  expect(result.current.isLoading).toBe(true)

  // Resolved state
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.name).toBe('Alice')
})

it('returns error state on failure', async () => {
  server.use(
    trpcMsw.user.getById.query(() => {
      throw new TRPCError({ code: 'NOT_FOUND' })
    })
  )

  const { result } = renderHook(() => useUser('999'), {
    wrapper: AllProviders,
  })

  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.error).toBeDefined()
})
```

## Testing Hook With Actions (useMutation)

```ts
import { act } from '@testing-library/react'

it('creates a user and invalidates list', async () => {
  const { result } = renderHook(() => useCreateUser(), {
    wrapper: AllProviders,
  })

  act(() => {
    result.current.mutate({ name: 'Bob', email: 'bob@example.com' })
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.name).toBe('Bob')
})
```

## Pure Logic Hooks (no QueryClient needed)

If the hook has no TanStack Query dependency, skip the wrapper:

```ts
import { renderHook, act } from '@testing-library/react'
import { useCounter } from '@client/hooks/useCounter'

it('increments count', () => {
  const { result } = renderHook(() => useCounter(0))
  act(() => result.current.increment())
  expect(result.current.count).toBe(1)
})
```
