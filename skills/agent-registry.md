---
name: agent-registry
description: Single source of truth for all agents — layer ownership, output artifacts, and phase
---

## Overview

This file is the single source of truth for all agents in the system. The
orchestrator-agent must load this file before making assignments. Do not
invent agent names that are not listed here.

---

## Planning Agents (Phase 0–1)

### requirements-agent

- **Phase:** Discovery
- **Layer:** Requirements
- **Responsible for:** Dialog with user to extract acceptance criteria and constraints
- **Output artifact:** `.cursor/tickets/<feature>/00-requirements.md`

### ux-designer-agent

- **Phase:** Discovery (conditional — only if feature has UI)
- **Layer:** UI/UX
- **Responsible for:** Dialog about user flows, component mapping, states, error paths
- **Output artifact:** `.cursor/tickets/<feature>/01-ui-spec.md`

### test-strategist-agent

- **Phase:** Discovery
- **Layer:** Tests
- **Responsible for:** Test strategy — unit, integration, E2E classification from requirements
- **Output artifact:** `.cursor/tickets/<feature>/02-test-spec.md`

### orchestrator-agent

- **Phase:** Planning
- **Layer:** Planning
- **Responsible for:** Task breakdown, dependencies, agent assignments from discovery artifacts
- **Output artifact:** `.cursor/tickets/<feature>/03-plan.md`

### ticket-writer-agent

- **Phase:** Planning
- **Layer:** Planning
- **Responsible for:** Per-task tickets with skills + Context7 snippets
- **Output artifact:** `.cursor/tickets/<feature>/tickets/T<NN>-<slug>.md`

### reviewer-agent

- **Phase:** Review
- **Layer:** Review
- **Responsible for:** Final review of artifacts, AC verification, commit snippet
- **Output artifact:** Review appended to plan, `.cursor/review-append.txt`

---

## Execution Agents (Phase 2–3)

### db-agent

- **Layer:** Database
- **Responsible for:** Schema migrations, tables, indexes, foreign keys (Drizzle + Supabase)
- **Output artifact:** `supabase/migrations/<timestamp>_<description>.sql`
- **Skills:** drizzle.md, supabase.md

### storage-agent

- **Layer:** Storage
- **Responsible for:** Storage buckets, RLS policies for storage objects
- **Output artifact:** Storage config or migration
- **Skills:** supabase.md

### api-agent

- **Layer:** API / Backend
- **Responsible for:** Hono routes, tRPC procedures, data-fetching
- **Output artifact:** `src/server/routers/<name>.ts`
- **Skills:** hono.md, trpc.md, supabase.md

### auth-agent

- **Layer:** Auth
- **Responsible for:** Better Auth guards, protected routes. Auth at application layer, not RLS.
- **Output artifact:** Guard, middleware, or wrapper
- **Skills:** better-auth.md

### ui-agent

- **Layer:** UI / Frontend
- **Responsible for:** React components, pages, client interactions (Shadcn)
- **Output artifact:** `src/pages/<page>.tsx`, `src/components/<name>.tsx`
- **Skills:** react.md, shadcn.md, tanstack.md

### test-writer-agent

- **Layer:** Tests
- **Responsible for:** Unit and integration tests from test spec. Runs before implementation.
- **Output artifact:** `tests/<domain>/*.test.ts`
- **Skills:** (from test spec)

### e2e-test-writer-agent

- **Layer:** Tests
- **Responsible for:** E2E tests from test spec. Runs before implementation.
- **Output artifact:** `tests/e2e/*.spec.ts` or `e2e/*.spec.ts`
- **Skills:** (from test spec)

### test-runner-agent

- **Layer:** Tests
- **Responsible for:** Runs full suite (unit + integration + E2E), self-heals flaky E2E
- **Output artifact:** Test run report
- **Phase:** Testing

### mutation-tester-agent

- **Layer:** Tests
- **Responsible for:** Stryker mutation testing, kills survivors
- **Output artifact:** Mutation report
- **Phase:** Testing

---

## Rules for Any Agent That Loads This File

- Only assign tasks to agents listed in this registry.
- Do not invent new agent names.
- Each task must have exactly one owner.
- If a new agent is needed, update this file first.
- If a requirement spans two layers, split into two tasks.
