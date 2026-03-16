# Severity Levels

Used consistently across all agents and review. See conventions/documentation.md for IK_TRANSFER_FAILURE.

## Levels

| Level | Meaning | When to use |
|-------|---------|-------------|
| **BLOCKING** | Must fix before merge. Unrecoverable if missed. | Security flaws, AC violations, IK_TRANSFER_FAILURE, critical logic errors |
| **SHOULD** | Recommended before merge. Maintainability debt. | Performance issues, inconsistent patterns, missing edge case handling |
| **CONSIDER** | Nice to have. Low impact. | Style, refactor opportunities, cosmetic improvements |

## Application

- **reviewer-agent** uses these when classifying findings.
- **Orchestrator** flags high-risk tasks.
- **Conventions** (structural, code-quality) tag each rule with a severity.
- Plans and tickets may reference severity for prioritization.

## Mapping from Other Taxonomies

| This stack | claude-config | gstack |
|------------|---------------|--------|
| BLOCKING | MUST, KNOWLEDGE | CRITICAL |
| SHOULD | SHOULD, STRUCTURE | — |
| CONSIDER | COULD, COSMETIC | — |
