# agent-stack

AI agent configuration for agentic coding in Cursor. Single stack: Supabase, Better Auth, Hono, tRPC, React, TanStack Router + Query, Shadcn.

Install as a Cursor plugin — improve a prompt once, every project gets it.

---

## Installation

### From a local clone (Pro users, private repo)

1. Clone this repo to a fixed location:

```bash
git clone git@github.com:you/agent-stack.git ~/agent-stack
```

2. Add as a local plugin in Cursor:

- **Cursor Settings** → **Plugins** → **Add local plugin**
- Point to `~/agent-stack` (or your clone path)

The plugin loads rules, skills, agents, commands, hooks, and MCP config from `src/`.

### From the marketplace (when published)

Install from the Cursor marketplace panel. Search for **agent-stack**.

---

## Repository structure

```
agent-stack/
├── .cursor-plugin/
│   └── plugin.json          ← manifest; paths point into src/
├── src/
│   ├── agents/              ← 16 agents (flattened)
│   ├── rules/
│   ├── skills/
│   ├── commands/
│   ├── hooks/
│   │   └── hooks.json
│   ├── scripts/
│   │   ├── *.js             ← Cursor hook scripts
│   │   └── git/
│   │       └── commit-msg-append-review.sh
│   └── .mcp.json
├── references/
│   └── claude-config-main/  ← reference material (ignored by plugin)
└── README.md
```

---

## 5-Phase Pipeline

| Phase | Agents | Output |
|-------|--------|--------|
| **0. Discovery** | requirements-agent, ux-designer-agent*, test-strategist-agent | 00-requirements.md, 01-ui-spec.md, 02-test-spec.md |
| **1. Planning** | orchestrator-agent, ticket-writer-agent | 03-plan.md, tickets/T*.md |
| **2. Execution** | test-writer-agent, e2e-test-writer-agent, db-agent, storage-agent, api-agent, auth-agent, frontend-agent, ui-agent | Code files |
| **3. Testing** | test-runner-agent, mutation-tester-agent | Test results, fixes |
| **4. Validation** | reviewer-agent | Review appended to plan, commit snippet |

*ux-designer-agent runs only when the feature has UI.

**Artifact flow:**

```
00-requirements.md  ← requirements-agent
01-ui-spec.md      ← ux-designer-agent (conditional)
02-test-spec.md    ← test-strategist-agent

         ↓ all 3 feed into

03-plan.md         ← orchestrator-agent

         ↓ plan feeds into

tickets/T01-*.md, T02-*.md, ...  ← ticket-writer-agent

         ↓ each ticket feeds its execution agent

         execution agents produce code

         ↓ then

test-runner-agent  → runs suite, fixes failures
mutation-tester-agent  → Stryker, kills survivors

         ↓ finally

reviewer-agent  → review, commit snippet
```

---

## Git commit-msg hook (optional)

To append the review snippet to commit messages, install the git hook:

```bash
# If you cloned agent-stack to ~/agent-stack
cp ~/agent-stack/src/scripts/git/commit-msg-append-review.sh .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

---

## MCP servers

Configure `.cursor/mcp.json` in your project for Supabase, Playwright, Context7, Better Auth. Credentials are project-specific, so these live in your project, not the plugin:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--supabase-url", "https://your-project.supabase.co",
        "--supabase-key", "${SUPABASE_SERVICE_KEY}",
        "--features", "database,storage"
      ]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

---

## Hooks

The plugin ships hooks that:

- **beforeShellExecution** — block dangerous shell commands (rm ~, force push, etc.)
- **afterFileEdit** — run ESLint + tsc after TS/JS edits
- **sessionStart** — log events to `~/.cursor/hooks-logs/`

They activate when the plugin is installed. No extra setup required.

---

## Example feature artifact structure

After a full pipeline run for feature `avatar-upload`:

```
.cursor/tickets/avatar-upload/
├── 00-requirements.md
├── 01-ui-spec.md
├── 02-test-spec.md
├── 03-plan.md
└── tickets/
    ├── T01-uploads-schema.md
    ├── T02-avatar-bucket.md
    ├── T03-upload-mutation.md
    ├── T04-upload-auth-guard.md
    ├── T05-upload-form.md
    ├── T06-unit-integration-tests.md
    ├── T07-e2e-tests.md
    ├── T08-test-run.md
    ├── T09-mutation-testing.md
    └── T10-review.md
```
