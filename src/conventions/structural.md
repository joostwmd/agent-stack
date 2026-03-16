# Structural Conventions

Applies to: packages/db, packages/auth, packages/server, src/ (or apps/).

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UploadForm.tsx`, `AvatarPicker.tsx` |
| Hooks | camelCase with `use` prefix | `useUpload.ts`, `useAuth.ts` |
| Utils/lib | camelCase or kebab-case | `formatFileSize.ts`, `db-safety-net.ts` |
| Tests | `*.test.ts(x)` or `*.spec.ts(x)` | `upload.test.ts`, `avatar.spec.tsx` |
| Migrations | timestamp_snake_case | `20260316_add_uploads_table.sql` |
| Routers | snake-case or kebab-case | `upload.ts`, `user-profile.ts` |

## Directory Layout (Monorepo)

```
packages/
  db/           — Drizzle schema, migrations, queries
  auth/         — Better Auth instance, adapters
  server/       — Hono + tRPC (or apps/server/)
src/            — React app, components, pages, hooks
  components/
  pages/
  hooks/
  lib/
.cursor/
  tickets/<feature>/  — discovery artifacts, plan, tickets
tests/         — unit, integration (per domain)
e2e/           — Playwright E2E (or tests/e2e/)
```

## Generated and Vendored Code

CLAUDE.md and project docs MUST flag files/directories that must not be manually edited:

| Pattern | When to read | Action |
|---------|--------------|--------|
| `supabase/migrations/*` | Understanding schema history | Regenerate via `pnpm db:generate` or equivalent; never edit hand-written |
| `node_modules/` | Never | Never edit |
| `*.generated.ts` | Understanding generated API | Regenerate; never edit |
| `dist/`, `build/` | Never | Never edit |

## Comment Timelessness Rule

Comments must be written in **timeless present** — from the perspective of a reader encountering the code for the first time.

**Contaminated (change-relative):**
- `// Added mutex to fix race condition`
- `// Replaced per-tag logging with summary`
- `// TODO: add retry logic later`

**Timeless present:**
- `// Mutex serializes cache access from concurrent requests`
- `// Single summary line; per-tag would produce 1500+ lines`
- `// Polling: 30% webhook delivery failures observed`

**Signal words to avoid:** Added, Replaced, Now uses, Changed to, New, Updated, Previously, Unlike the old, Will, TODO (unless actionable), Temporary workaround until.

**Transformation pattern:** Extract the technical justification, discard the change narrative.
