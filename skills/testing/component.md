# Component and UI Tests

React component tests with Testing Library. Stack-context defines Vitest. Project-context defines paths and `renderWithProviders`.

- Use Testing Library: `getByRole` → `getByLabelText` → `getByText` (never `getByTestId` for primary queries).
- Async: `findBy*` or `waitFor` after interactions — never bare `getBy` for post-interaction assertions.
- Cover states from UI spec: idle, loading, success, error, empty.
- Do not test Shadcn/Radix internals.
