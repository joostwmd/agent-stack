# MSW and msw-trpc Handlers

Mock service worker setup for tRPC and API tests. Project-context defines handler paths and conventions.

- Use `server.use()` overrides for error states — one override per error scenario.
- Do not mock TanStack Query at module level; use msw-trpc handlers.
- Stack: Vitest + MSW.
