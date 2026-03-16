# Naming (Implicit Contract Integrity)

**Core question:** Does the name predict behavior? Functions that don't do what they're named are a BLOCKING risk.

## Severity: BLOCKING

- **Name-behavior mismatch**: e.g. `get` that mutates, `validate` that parses
- **Domain concepts in raw comparisons**: same concept checked via primitive in 2+ places (e.g. `role == 'admin'`)

## Severity: SHOULD

- Vague umbrella terms: `Manager`, `Handler`, `Utils`, `Helper`
- Multiple names for same concept within a file: `user` vs `account` vs `customer`

## Severity: CONSIDER

- Negated booleans: `isNotValid` → `isInvalid`
- Imperfect-but-accurate names (style preference)

## Threshold

Flag only when the name actively misleads. Imperfect but accurate names are style, not quality.
