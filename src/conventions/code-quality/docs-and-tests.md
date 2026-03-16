# Documentation & Tests

**Core question:** Is this documented and tested? Stale docs cause hallucinations. Tests that don't communicate behavior fail as documentation.

## Severity: BLOCKING

- Documentation that contradicts code (e.g. docstring param not in signature)
- Generated/vendored files without regeneration command in CLAUDE.md
- Schema drift: code references field not in schema, or vice versa

## Severity: SHOULD

- Stale claims in docs (docstring describes return value code never returns)
- Test names that give no behavioral information: `test_works`, `test_ok`, `test_success`
- Tests with 0 assertions
- Generated code without provenance in CLAUDE.md

## Severity: CONSIDER

- Incomplete documentation (missing is acceptable, wrong is not)
- Orphaned TODO/FIXME referencing completed work
- Multiple similar tests with minor variations (prefer parameterized)

## Threshold

Flag only demonstrable incorrectness, not incompleteness. Incorrect docs cause hallucinations; missing docs just mean less context.
