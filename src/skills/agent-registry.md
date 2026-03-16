---
name: agent-registry
description: Single source of truth for all agents — layer ownership, output artifacts, and phase
---

## Overview

This file is the single source of truth for all agents in the system. The
orchestrator-agent must load this file before making assignments. Do not
invent agent names that are not listed here.

---

## Discovery Agents (Phase 0)

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

- **Phase:** Discovery (runs last in Discovery — after requirements and ux-designer)
- **Layer:** Tests
- **Responsible for:** Test strategy — unit, integration, E2E classification from requirements and UI spec
- **Consumes from:** requirements-agent (00-requirements.md), ux-designer-agent (01-ui-spec.md when feature has UI)
- **Output artifact:** `.cursor/tickets/<feature>/02-test-spec.md`

## Planning Agents (Phase 1)

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

## Validation Agents (Phase 4)

### reviewer-agent

- **Phase:** Validation
- **Layer:** Review
- **Responsible for:** Final review of artifacts, AC verification, commit snippet
- **Output artifact:** Review appended to plan, `.cursor/review-append.txt`

---

## Execution Agents (Phase 2)

### db-agent

- **Layer:** Database
- **Responsible for:** Schema migrations, tables, indexes, foreign keys (Drizzle + Supabase)
- **Output artifact:** `packages/db/` — schema, migrations (`supabase/migrations/` or equivalent)
- **Skills:** skills/database/_index.md (root) + load only the specific file needed (connection.md, schema.md, transactions.md, error-handling.md, queries.md, performance.md, migrations.md)

### storage-agent

- **Layer:** Storage
- **Responsible for:** Storage buckets, RLS policies for storage objects
- **Output artifact:** Storage config or migration
- **Skills:** supabase.md

### api-agent

- **Layer:** API / Backend
- **Responsible for:** Hono + tRPC (combined in server app), procedures, data-fetching
- **Output artifact:** `packages/server/src/routers/<name>.ts` (or `apps/server/src/routers/<name>.ts`)
- **Skills:** hono.md, trpc.md, skills/auth/, skills/database/ (load _index.md + specific file when needed), supabase.md

### auth-agent

- **Layer:** Auth
- **Responsible for:** Better Auth config, guards, protected routes. Auth at application layer, not RLS.
- **Output artifact:** `packages/auth/` — Better Auth instance, adapters, session config
- **Skills:** skills/auth/

### frontend-agent

- **Layer:** UI / Frontend
- **Responsible for:** React components, pages, client state, data fetching, forms, Shadcn composition
- **Output artifact:** `src/pages/<page>.tsx`, `src/components/<name>.tsx`, `src/hooks/*.ts`
- **Skills:** skills/frontend/ — load only the specific skill needed (shadcn, tanstack-query-best-practices, react-best-practices, zustand, design). For design: see skills/frontend/design/_index.md routing table (adapt, animate, audit, bolder, clarify, colorize, critique, delight, distill, extract, frontend-design, harden, normalize, onboard, optimize, polish, quieter, teach-impeccable).

### test-writer-agent

- **Layer:** Tests
- **Responsible for:** Unit and integration tests from test spec. Runs before implementation.
- **Output artifact:** `tests/<domain>/*.test.ts`
- **Skills:** skills/testing/_index.md (root) + load only the specific file needed (component.md, msw.md, forms.md, hooks.md, trpc.md, db-queries.md, db-infra.md, shadcn.md). Ticket may specify which skill; otherwise use routing table.

### e2e-test-writer-agent

- **Layer:** Tests
- **Responsible for:** E2E tests from test spec. Runs before implementation.
- **Output artifact:** `tests/e2e/*.spec.ts` or `e2e/*.spec.ts`
- **Skills:** (from test spec)

---

## Testing Agents (Phase 3)

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
