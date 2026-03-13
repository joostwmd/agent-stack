# Shadcn / Radix Component Gotchas

Testing Shadcn and Radix components without testing their internals. See `skills/frontend/shadcn/SKILL.md`.

- Prefer user-facing queries: role, label, visible text.
- Dialogs/modals: ensure component is rendered and visible before asserting.
- Do not assert on internal DOM structure of Radix primitives.
