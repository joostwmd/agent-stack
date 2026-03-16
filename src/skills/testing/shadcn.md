# Shadcn / Radix UI Testing Gotchas

## The Required Mock — PointerEvent

Radix UI uses Pointer Events API internally. jsdom does not fully implement
it. Without this mock, Select, DropdownMenu, Popover, Combobox, and
ContextMenu will silently fail to open in tests.

**Add to `tests/_utils/setup.ts` (the global setup file):**

```ts
// tests/_utils/setup.ts
class MockPointerEvent extends Event {
  button: number
  ctrlKey: boolean
  pointerType: string

  constructor(type: string, props: PointerEventInit = {}) {
    super(type, props)
    this.button = props.button ?? 0
    this.ctrlKey = props.ctrlKey ?? false
    this.pointerType = props.pointerType ?? 'mouse'
  }
}

window.PointerEvent = MockPointerEvent as any
window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
```

## Dialog / Sheet

Radix portals render to `document.body`, outside the component tree.
`screen` queries the whole body — portals are found automatically.
Always `await` after opening because Radix applies an open animation:

```ts
const user = userEvent.setup()

await user.click(screen.getByRole('button', { name: /open dialog/i }))

// findByRole waits for the portal to appear
const dialog = await screen.findByRole('dialog')
expect(dialog).toBeInTheDocument()

// Interact with content inside the dialog
await user.click(screen.getByRole('button', { name: /confirm/i }))

// Assert dialog closed
await waitFor(() =>
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
)
```

## Select

With the PointerEvent mock in place:

```ts
const user = userEvent.setup()

// Open the Select
await user.click(screen.getByRole('combobox'))

// Options are now in the DOM (portal)
const option = await screen.findByRole('option', { name: /admin/i })
await user.click(option)

// Assert selected value
expect(screen.getByRole('combobox')).toHaveTextContent('Admin')
```

## DropdownMenu

```ts
await user.click(screen.getByRole('button', { name: /open menu/i }))
const menuItem = await screen.findByRole('menuitem', { name: /delete/i })
await user.click(menuItem)
```

## Checkbox

Radix `Checkbox` renders with `role="checkbox"`:

```ts
const checkbox = screen.getByRole('checkbox', { name: /accept terms/i })
expect(checkbox).not.toBeChecked()
await user.click(checkbox)
expect(checkbox).toBeChecked()
```

## Common Failure Patterns

| Symptom | Cause | Fix |
|---------|-------|-----|
| Select options never appear | Missing PointerEvent mock | Add mock to setup.ts |
| `getByRole('dialog')` throws | Not awaiting portal render | Use `findByRole('dialog')` |
| `hasPointerCapture is not a function` | Missing prototype mock | Add `HTMLElement.prototype.hasPointerCapture = vi.fn()` |
| Checkbox click has no effect | PointerEvent mock missing | Add mock to setup.ts |
