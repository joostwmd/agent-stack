---
name: review
description: Pre-landing review — load checklist, run reviewer-agent.
---

# Review

Pre-landing review of changed files against the review checklist.

## Preconditions

- Changed files (e.g. `git diff origin/main`)

## First action

1. Read `src/review/checklist.md` for criteria and severity labels.

2. Load reviewer-agent with:
   - Ticket or plan context (if available)
   - `src/review/checklist.md`
   - The diff to review

3. Reviewer outputs findings with BLOCKING / SHOULD / CONSIDER. Fix BLOCKING before merge.
