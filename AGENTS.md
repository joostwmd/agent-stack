# AI Agent & Skill Guidelines

Guidance for writing agent files and skills for this stack. The goal: **agents stay lean and scoped; skills hold implementation depth**. This reduces context bloat, keeps agents focused, and makes knowledge reusable across agents.

---

## 1. Separation of Concerns: Agents vs Skills

### Agents — Identity, Scope, and Constraints

Agents define **who** they are, **where** they fit, **what** they own, and **how** they must behave. They do **not** contain implementation details.

| Include in agent | Do NOT include |
|------------------|----------------|
| Architecture (where this agent sits in the system) | Code examples, implementation patterns |
| Codebase location (paths, owned files) | Step-by-step how-to guides |
| Responsibilities (bullet list) | Full API references, config examples |
| Tools (frontmatter `allowed-tools`) | Detailed error-code mappings, schemas |
| Constraints (behavioral rules) | Cheatsheets, copy-paste snippets |
| Skill loading (which skill file to load for which task) | Migration commands, CLI usage details |
| Cross-agent boundaries (what this agent does NOT do) | |

**Principle:** If an AI needs to *implement* something, that belongs in a skill. If it needs to *decide whether to do it* or *where to do it*, that belongs in the agent.

---

### Skills — Implementation Knowledge

Skills hold the **how**: patterns, code examples, conventions, and domain-specific details. They are loaded on demand when the agent has a concrete task.

| Include in skills | Do NOT include |
|-------------------|----------------|
| Implementation code, snippets | Agent identity or routing logic |
| Step-by-step procedures | Cross-agent boundaries |
| API usage patterns, config examples | Tool permissions |
| Error mappings, schema definitions | |

**Principle:** Skills answer "How do I do X?" Agents answer "Am I responsible for X? Where does X live? What rules apply?"

---

## 2. Agent Size Constraint: Under 3,000 Tokens

Each agent file **must stay under ~3,000 tokens**. Roughly:

- ~4 chars ≈ 1 token in English
- ~750 words ≈ 3,000 tokens

### Why

- Keeps agent context from crowding out task-specific context
- Forces discipline: agents stay scoped; detail moves to skills
- Improves latency and cost when loading agents

### How to Stay Under the Limit

1. **Remove implementation.** Move code, examples, and step-by-step guides to skills.
2. **Use tables and lists.** Dense, scannable format instead of prose.
3. **Link, don’t inline.** Reference skill files instead of duplicating their content.
4. **One section per concern.** Architecture, Location, Responsibilities, Constraints, Skill Loading, Cross-Agent Boundaries. Avoid redundancy.
5. **Trim "Output format"** to a short checklist, not a full template.

If an agent grows past ~3k tokens, move the largest sections into skills and replace them with a short "Load skill X for Y" pointer.

---

## 3. Skill Structure: Chunks + Index

When a domain has many implementation concerns, split skills into **small, focused files** inside a **directory** with an **index file**.

### Directory Layout

```
skills/
├── database/           # Chunked skill domain
│   ├── _index.md       # Overview + routing table (required)
│   ├── connection.md
│   ├── schema.md
│   ├── transactions.md
│   ├── error-handling.md
│   ├── queries.md
│   ├── performance.md
│   └── migrations.md
├── auth/               # Better Auth: _index.md + skills (best-practices, security, 2FA, orgs)
├── trpc.md             # Single file when domain is small
```

### The Index File (`_index.md`)

The index file is the **entry point** for that skill domain. It must:

1. **Summarize the domain** in 3–5 bullets.
2. **Provide a routing table**: Task → which file to load.
3. **State shared rules** that apply across all chunks (concise).
4. **Remind: load only the relevant file**, not all chunks.

**Do not** put full implementation in the index. Implementation belongs in the chunk files.

Example routing table:

```markdown
| Task | Load |
|------|------|
| Pool setup, Better Auth db wiring | connection.md |
| Creating/modifying tables, relations | schema.md |
| tx proxy, withTransaction | transactions.md |
| dbSafe, error classes, retry | error-handling.md |
```

### Chunk Files

Each chunk covers **one concern** (e.g. transactions, schema, migrations). It should:

- Be self-contained for its concern
- Include code examples, patterns, and conventions
- Avoid cross-referencing other chunks unless necessary
- Stay focused — if a chunk grows large, consider splitting further

### When to Use Chunks vs Single File

| Use a directory + index | Use a single file |
|-------------------------|-------------------|
| Domain has 4+ distinct implementation concerns | Domain is narrow (1–2 concerns) |
| Different tasks need different subsets of knowledge | Same content applies to all tasks |
| Example: database (connection, schema, tx, errors, queries, migrations) | Example: trpc, hono, react |

---

## 4. Agent Structure Checklist

Every agent file should include:

| Section | Content | Approx size |
|---------|---------|-------------|
| **Frontmatter** | name, description, model, allowed-tools | — |
| **Architecture** | Diagram or bullets — where this agent fits | ~200 tokens |
| **Location** | Owned paths and files | ~150 tokens |
| **Responsibilities** | Bullet list | ~100 tokens |
| **Constraints** | Numbered rules (no implementation) | ~200 tokens |
| **Skill Loading** | Routing table + "load one, not all" | ~150 tokens |
| **Cross-Agent Boundaries** | Table: this agent does NOT / who does | ~100 tokens |
| **Output Format** | Short checklist | ~50 tokens |

**Total target:** ~950 tokens for structure; remaining budget for edge cases and links.

---

## 5. Skill Loading from Agents

Agents **must** instruct the AI to:

1. **Read the skill index first** (e.g. `skills/database/_index.md`).
2. **Load only the file relevant to the current task**, using the routing table.
3. **Not load all files** in a skill directory at once.

Example from an agent:

```markdown
## Skill Loading

**Always read** `skills/database/_index.md` first.

**Then load ONLY** the file relevant to your current task:

| Task | Load |
|------|------|
| Pool setup, Better Auth db wiring | connection.md |
| Creating/modifying tables | schema.md |
| ... | ... |

**Do not load all files.** Load one, do the work, move on.
```

---

## 6. Summary

| Artifact | Purpose | Size / Structure |
|----------|---------|------------------|
| **Agent** | Identity, scope, constraints, routing | < 3,000 tokens; no implementation |
| **Skill index** | Overview + routing table | Short; links to chunks |
| **Skill chunk** | Implementation for one concern | Focused; code + patterns |
| **Single skill file** | Implementation for a narrow domain | One file when chunks aren’t needed |

Agents answer: *Who am I? What do I own? What are my rules? Where do I get the how?*  
Skills answer: *How do I implement this?*
