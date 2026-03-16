# Documentation Conventions

Authority for CLAUDE.md, README.md, and invisible knowledge placement.

## Core Principles

**CLAUDE.md = pure index**: Navigation only. What is in the directory and when to read each file. Explanatory content belongs in README.md.

**README.md = invisible knowledge**: README captures knowledge NOT visible from reading source code. If invisible knowledge exists for a directory, README.md is required.

**Self-contained documentation**: Do not reference external authoritative sources. If knowledge exists elsewhere, summarize locally.

## Invisible Knowledge Test

Create README.md when the directory contains ANY invisible knowledge:

- Planning decisions and rationale
- Business context (why the product works this way)
- Architectural rationale (why this structure)
- Trade-offs made (what was sacrificed for what)
- Invariants (rules that must hold but are not in types)
- Rejected alternatives (what was considered and dismissed)
- Performance characteristics (non-obvious properties)
- Failure modes or edge cases not apparent from code

**DO NOT create README.md when:** The directory is purely organizational, or all knowledge is visible from source code.

## Content Test

For each sentence in README.md: "Could a developer learn this by reading the source files?"

- If YES: delete the sentence
- If NO: keep it

README earns its tokens by providing INVISIBLE knowledge: the reasoning behind the code.

## Placement Hierarchy

Invisible knowledge belongs as close as possible to the code it describes:

1. **Inline comment** — applies to a specific statement
2. **Function-level block** — applies to an entire function's approach
3. **Module docstring** — applies to why this module exists
4. **README.md** — cross-cutting or cannot be localized

## IK_TRANSFER_FAILURE

**Severity: BLOCKING**

Invisible knowledge not at its best location = IK_TRANSFER_FAILURE.

- Comment that describes "what" instead of "why" at a non-obvious decision point
- Design rationale only in planning artifacts, not carried into codebase
- Plan with empty Invisible Knowledge section (see Plan-Level IK below)

Every decision, constraint, and tradeoff must land in code or README.md.

---

## Plan-Level Invisible Knowledge

Every `03-plan.md` MUST contain a `## Invisible Knowledge` section.

The orchestrator-agent is accountable for filling it at plan creation time — not as a separate step afterward.

### Required Fields

| Field | Description |
|-------|-------------|
| **system** | Why this approach was chosen over alternatives (1–3 sentences) |
| **invariants** | Things that must always remain true regardless of implementation |
| **tradeoffs** | What was accepted and why (e.g. consistency vs speed) |
| **rejected_alternatives** | What was considered and dismissed with reasons |

### IK_TRANSFER_FAILURE for Plans

If any field is empty, the plan is incomplete. The orchestrator must not submit a plan with blank IK fields.

If a field does not apply to this feature, state explicitly why (e.g. "No rejected alternatives — requirements were unambiguous").

### Format in 03-plan.md

```markdown
## Invisible Knowledge

**System rationale:** [why this approach over the obvious alternatives]

**Invariants:**
- [e.g. "users can only read their own uploads — enforced at application layer"]

**Accepted trade-offs:**
- [e.g. "optimistic updates accepted over guaranteed consistency — UX priority in requirements"]

**Rejected alternatives:**
- [e.g. "RLS considered but rejected — Better Auth handles auth at application layer per stack-context"]
```
