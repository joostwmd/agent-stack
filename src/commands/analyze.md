---
name: analyze
description: 4-step codebase analysis — structure, dependencies, patterns, recommendations.
---

# Analyze

4-step codebase analysis. No script. Use when exploring or onboarding to a codebase.

## Steps

### 1. Structure mapping

- List top-level directories and their purpose
- Identify entry points (main, app, server, etc.)
- Map package/module boundaries

### 2. Dependency graph

- Identify external dependencies (packages, APIs)
- Identify internal dependencies between packages/modules
- Flag circular dependencies if any

### 3. Pattern inventory

- Conventions in use (testing, styling, structure)
- Repeated patterns (good or concerning)
- Technology choices and their consistency

### 4. Recommendations

- Strengths to preserve
- Gaps or risks (testing, docs, security)
- Quick wins vs larger refactors

Output as structured markdown. Be concise. Cite file:line when relevant.
