---
name: critique
description: 7-step decision critique — decompose, verify, challenge, synthesize. Ported from claude-config decision_critic.
---

# Critique

Structured decision criticism. Seven steps, no script. Use when reviewing a significant decision (architecture, approach, tradeoff).

## Steps

### 1. Extract structure

Assign stable IDs (persist through ALL steps):

- **CLAIMS [C1, C2, ...]** — Factual assertions (3–7). What facts/cause-effect relationships are assumed?
- **ASSUMPTIONS [A1, A2, ...]** — Unstated beliefs (2–5). What is implied but not stated?
- **CONSTRAINTS [K1, K2, ...]** — Hard boundaries (1–4). Technical/organizational limitations?
- **JUDGMENTS [J1, J2, ...]** — Subjective tradeoffs (1–3). Where are values weighed?

Format: `C1: <claim> | A1: <assumption> | K1: <constraint>`

### 2. Classify verifiability

For each item from Step 1:

- **[V] VERIFIABLE** — Can be checked against evidence
- **[J] JUDGMENT** — Subjective, no objective answer
- **[C] CONSTRAINT** — Given condition, accepted as fixed

Format: `C1 [V]: <claim> | A1 [J]: <assumption>`. Count how many [V] items need verification.

### 3. Generate questions

For each [V] item, generate 1–3 verification questions. Criteria: specific, independently answerable, designed to FALSIFY (not confirm).

### 4. Factored verification

Answer each question INDEPENDENTLY. Use only established knowledge, stated constraints, logical inference. Do NOT assume the decision is correct and work backward. Mark each [V] item: **VERIFIED**, **FAILED**, or **UNCERTAIN**.

### 5. Contrarian perspective

Generate the STRONGEST argument AGAINST the decision. Steel-man the opposition. Output: CONTRARIAN POSITION, ARGUMENT, KEY RISKS.

### 6. Alternative framing

Challenge the PROBLEM STATEMENT. Is this the right problem or a symptom? What would a different stakeholder prioritize? Output: ALTERNATIVE FRAMING, WHAT THIS EMPHASIZES, HIDDEN ASSUMPTIONS REVEALED, IMPLICATION FOR DECISION.

### 7. Synthesis and verdict

Verdict rubric:

- **ESCALATE** — Any FAILED on safety/security/compliance; critical UNCERTAIN; alternative framing reveals problem is wrong
- **REVISE** — Any FAILED on core claim; multiple UNCERTAIN; challenge revealed gaps
- **STAND** — No FAILED on core claims; UNCERTAIN acknowledged as accepted risks; challenges addressable

Output: VERDICT (STAND | REVISE | ESCALATE), VERIFICATION SUMMARY, CHALLENGE ASSESSMENT, RECOMMENDATION.
