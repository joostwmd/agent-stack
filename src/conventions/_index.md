# Conventions Registry

Single source of truth: which agents load which conventions.

## Agent → Convention Mapping

| Agent | Load |
|-------|------|
| orchestrator-agent | structural.md, severity.md |
| ticket-writer-agent | documentation.md, severity.md |
| reviewer-agent | documentation.md, severity.md, code-quality/ |
| requirements-agent | documentation.md |
| ux-designer-agent | documentation.md, structural.md |
| test-strategist-agent | documentation.md, severity.md |
| test-writer-agent | structural.md, severity.md, code-quality/docs-and-tests.md |
| e2e-test-writer-agent | structural.md, severity.md |
| db-agent | structural.md, severity.md |
| storage-agent | structural.md, severity.md |
| api-agent | structural.md, severity.md |
| auth-agent | structural.md, severity.md |
| frontend-agent | structural.md, severity.md |
| test-runner-agent | severity.md |
| mutation-tester-agent | severity.md |

## Rules

- Before adding a new convention: update this table to assign it to agents.
- Before editing an existing convention: check all agents that load it.
- Each agent should load only what it needs — avoid loading the entire conventions tree.
