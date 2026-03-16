# TODOS.md Format

Canonical format for project `TODOS.md`. Use priority levels for actionable items.

## Structure

```markdown
## <Component or Area>

- **P0** [description] — [why critical]
- **P2** [description] — [context for future pickup]

## Completed

- [description] — **Completed:** v1.2.0 (2026-03-15)
```

## Priority Levels

| Level | Meaning | When to use |
|-------|---------|-------------|
| **P0** | Critical; blocks or severely limits value | Must do before ship |
| **P1** | Important; should do soon | High value, reasonable effort |
| **P2** | Deferred; context for future pickup | Lower priority, documented for handoff |
| **P3** | Nice to have | Optional improvement |

## Rules

- One item per line; keep descriptions scannable.
- **P0** items should be rare — escalate or split if many accumulate.
- Completed items move to `## Completed` with version and date.
- Components can be feature names, package names, or areas (e.g. `Auth`, `Upload`, `Frontend`).
