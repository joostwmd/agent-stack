# Form Testing — RHF + Zod + Shadcn Form

## Core Pattern

```ts
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/_utils/react'
import { CreateUserForm } from '@client/features/users/CreateUserForm'

describe('CreateUserForm', () => {
  const user = userEvent.setup()

  it('shows validation errors on empty submit', async () => {
    renderWithProviders(<CreateUserForm />)
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
  })

  it('submits with valid data and shows confirmation', async () => {
    renderWithProviders(<CreateUserForm />)
    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByText(/user created/i)).toBeInTheDocument()
  })

  it('shows server error and preserves form values', async () => {
    server.use(
      trpcMsw.user.create.mutation(() => {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' })
      })
    )
    renderWithProviders(<CreateUserForm />)
    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(await screen.findByText(/email already exists/i)).toBeInTheDocument()
    // Form values must be preserved — user should not lose their input
    expect(screen.getByLabelText(/name/i)).toHaveValue('Alice')
    expect(screen.getByLabelText(/email/i)).toHaveValue('alice@example.com')
  })

  it('resets form after successful submission', async () => {
    renderWithProviders(<CreateUserForm />)
    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await screen.findByText(/user created/i)
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
  })

  it('disables submit button while submitting', async () => {
    renderWithProviders(<CreateUserForm />)
    await user.type(screen.getByLabelText(/name/i), 'Alice')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })
})
```

## Typing into Shadcn Inputs

Shadcn `Input` renders a native `<input>` — query by label:

```ts
await user.type(screen.getByLabelText(/email/i), 'test@example.com')
```

Shadcn `<FormLabel>` links to the field via `htmlFor` automatically when
using the `<FormField>` pattern. If `getByLabelText` fails, the label is
not properly linked — that is an a11y bug, not a test setup bug.

## Shadcn Select in Forms

See `shadcn.md` for the PointerEvent mock required to open Select options.

```ts
// After mock is in place:
await user.click(screen.getByRole('combobox'))
await user.click(await screen.findByRole('option', { name: /admin/i }))
expect(screen.getByRole('combobox')).toHaveTextContent('Admin')
```

## Zod Schema Unit Tests (separate from form tests)

Test the schema directly — fast, no render needed, high Stryker value:

```ts
// tests/api/schemas/user.test.ts
import { createUserSchema } from '@server/schemas/user'

it('rejects email without @', () => {
  const result = createUserSchema.safeParse({ name: 'Alice', email: 'notanemail' })
  expect(result.success).toBe(false)
  expect(result.error?.issues[0].path).toContain('email')
})

it('accepts valid input', () => {
  const result = createUserSchema.safeParse({
    name: 'Alice',
    email: 'alice@example.com'
  })
  expect(result.success).toBe(true)
})
```
