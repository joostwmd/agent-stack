---
name: discover
description: Dialog-driven discovery — requirements, UI spec (if needed), test spec. No script.
---

# Discover

Dialog-driven discovery. No script — the AI follows this workflow via conversation.

## Preconditions

None. Use when starting a new feature.

## Workflow

1. **Feature slug** — Establish the feature name (e.g. `avatar-upload`). Create `.cursor/tickets/<feature>/` if needed.

2. **Requirements** — Load requirements-agent. Dialog to extract acceptance criteria and constraints. Output: `00-requirements.md`.

3. **UI spec (conditional)** — If the feature has UI: load ux-designer-agent. Dialog about flows, components, states. Output: `01-ui-spec.md`.

4. **Test spec** — Load test-strategist-agent. Classify unit, integration, E2E from requirements and UI spec. Output: `02-test-spec.md`.

## First action

Ask the user: "What feature are you building? (Give a short slug, e.g. avatar-upload)"

Then proceed with the discovery agents in order. Ensure all Open Questions in requirements are resolved before moving to plan.
