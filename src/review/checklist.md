# Pre-Landing Review Checklist

Review `git diff origin/main` (or equivalent) against these criteria. Cite `file:line` and suggest fixes. Skip anything that's fine.

**Output format:**

```
Review: N issues (X BLOCKING, Y SHOULD, Z CONSIDER)

**BLOCKING:**
- [file:line] Problem. Fix: suggested fix

**SHOULD:**
- [file:line] Problem. Fix: suggested fix

**CONSIDER:**
- [file:line] Problem. Fix: suggested fix
```

If no issues: `Review: No issues found.`

---

## 1. Correctness [BLOCKING / SHOULD]

| Severity | Check |
|----------|-------|
| BLOCKING | Logic errors, null/undefined access, race conditions (check-then-set, TOCTOU) |
| BLOCKING | N+1 queries: loops over results that trigger additional queries (missing `.with()`, joins, or batch loading) |
| BLOCKING | Enum/value completeness: new enum value, status string, or constant — trace to every consumer; any consumer not handling it = BLOCKING |
| SHOULD | Conditional side effects: branch applies side effect on one path but forgets the other |
| SHOULD | Magic numbers or string coupling: bare literals used in multiple files without named constants |

---

## 2. Security [BLOCKING]

| Severity | Check |
|----------|-------|
| BLOCKING | No secrets in code, env, or logs |
| BLOCKING | Auth on every protected endpoint (Better Auth session, not RLS-only) |
| BLOCKING | Input validation at boundaries: LLM-generated values, user input, external APIs |
| BLOCKING | SQL injection: no string interpolation in SQL (use parameterized queries, Drizzle) |
| BLOCKING | XSS: no `dangerouslySetInnerHTML` or equivalent on user-controlled data without sanitization |

---

## 3. Performance [SHOULD]

| Severity | Check |
|----------|-------|
| SHOULD | Bounded memory: no unbounded arrays/streams in hot paths |
| SHOULD | No N+1 (see Correctness) |
| SHOULD | O(n*m) in views/lists: prefer `index_by` / hash lookup over nested loops |
| CONSIDER | Inline styles or heavy re-renders in React (e.g. inline objects in JSX) |

---

## 4. Maintainability [SHOULD / CONSIDER]

| Severity | Check |
|----------|-------|
| SHOULD | Names match behavior (conventions/code-quality/naming.md) |
| SHOULD | Single-purpose functions; no god functions |
| SHOULD | Dead code: unused variables, impossible branches, unused imports |
| SHOULD | Comments in timeless present (conventions/structural.md) |
| CONSIDER | Duplicate logic; over/under-abstraction (conventions/code-quality/structure.md) |

---

## 5. Testing [SHOULD / CONSIDER]

| Severity | Check |
|----------|-------|
| SHOULD | Behavior covered: tests verify observable behavior, not implementation details |
| SHOULD | Edge cases and negative paths: assertions on side effects, not just status/type |
| SHOULD | Auth/security features: integration test verifying enforcement path |
| CONSIDER | Test names communicate behavior (not `test_works`, `test_ok`) |
| CONSIDER | Parameterized tests over duplicate test bodies |

---

## Suppressions — DO NOT flag

- Harmless redundancy that aids readability
- "Add a comment explaining why" — comments rot
- Consistency-only changes with no functional impact
- Anything already addressed in the diff you're reviewing — read the full diff first
