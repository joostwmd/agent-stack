---
name: agent-registry
description: Single source of truth for all agents in the system — layer ownership, output artifacts, and assignment rules
---

## Overview

This file is the single source of truth for all agents in the system. Any agent that assigns or delegates work must load this file before making assignments. Do not invent agent names that are not listed here.

---

## Registered Agents

### db-agent

- **Layer:** Database
- **Responsible for:** Schema migrations, adding or modifying tables and columns, index creation, foreign key constraints
- **Output artifact:** Migration file (e.g. `supabase/migrations/<timestamp>_<description>.sql`)
- **Commit prefix:** db:

### storage-agent

- **Layer:** Storage
- **Responsible for:** Creating and configuring storage buckets, writing Row Level Security policies for storage objects
- **Output artifact:** Storage configuration or migration file
- **Commit prefix:** storage:

### api-agent

- **Layer:** API / Backend
- **Responsible for:** Creating and modifying API routes, server actions, and data-fetching functions
- **Output artifact:** Route or server action file (e.g. `app/api/<route>/route.ts`)
- **Commit prefix:** api:

### auth-agent

- **Layer:** Auth
- **Responsible for:** Protecting routes and endpoints with authentication and authorisation guards, writing RLS policies on database tables
- **Output artifact:** Middleware file, RLS policy migration, or guard function
- **Commit prefix:** auth:

### ui-agent

- **Layer:** UI / Frontend
- **Responsible for:** Building and modifying React components, pages, and client-side interactions
- **Output artifact:** Component or page file (e.g. `app/<page>/page.tsx`, `components/<name>.tsx`)
- **Commit prefix:** ui:

### test-definer-agent

- **Layer:** Tests
- **Responsible for:** Reading the requirements document and producing a plain-language test specification that lists every behaviour to be verified. Runs before any test code is written.
- **Output artifact:** `.cursor/tickets/<feature>/test-spec.md`
- **Commit prefix:** test-spec:

### unit-test-writer-agent

- **Layer:** Tests
- **Responsible for:** Translating the test spec into failing unit and integration tests. Runs after test-definer-agent and before implementation agents.
- **Output artifact:** Test files under `tests/` or co-located `.test.ts` files
- **Commit prefix:** test(unit):

### e2e-test-writer-agent

- **Layer:** Tests
- **Responsible for:** Translating the test spec into failing end-to-end tests. Runs after test-definer-agent and before implementation agents.
- **Output artifact:** Test files under `e2e/` (e.g. Playwright `.spec.ts` files)
- **Commit prefix:** test(e2e):

### e2e-runner-agent

- **Layer:** Tests
- **Responsible for:** Executing the full end-to-end test suite and reporting results. Runs after all implementation agents have completed.
- **Output artifact:** Test run report
- **Commit prefix:** test(run):

### mutation-tester-agent

- **Layer:** Tests
- **Responsible for:** Running mutation testing to verify that the test suite catches real faults. Runs after e2e-runner-agent.
- **Output artifact:** Mutation testing report
- **Commit prefix:** test(mutation):

### reviewer-agent

- **Layer:** Review
- **Responsible for:** Performing a final review of all artifacts produced in the plan — code, tests, migrations, and documentation — and verifying that all acceptance criteria are met.
- **Output artifact:** Review report or inline comments
- **Commit prefix:** review:

---

## Rules for Any Agent That Loads This File

- Only assign tasks to agents listed in this registry.
- Do not invent new agent names.
- Each task must have exactly one owner.
- If a new agent is needed, update this file first — then update any agent that loads it.
- If a requirement spans two layers, split it into two tasks and assign each to its respective agent.
