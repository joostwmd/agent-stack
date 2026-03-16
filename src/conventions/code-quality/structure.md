# Structure (Duplication, Over/Under-Abstraction)

**Core question:** Does the structure reveal intent? Can I change it without understanding everything?

## Severity: BLOCKING

- God functions: multiple unrelated responsibilities
- Swallowed exceptions or generic catches that lose information

## Severity: SHOULD

- Duplicate logic: copy-pasted blocks, repeated error handling, parallel near-identical functions
- Deep nesting (3+ levels) obscuring control flow
- Boolean flag tangles (3+ flags interacting = implicit state machine)
- Hard-coded dependencies making business logic untestable

## Severity: CONSIDER

- Long parameter lists (4+ params)
- Boolean parameters that fork behavior (split into two functions)

## Threshold

Flag when structure obscures intent or changes would ripple unnecessarily. Length alone is not a smell.

## Exceptions

- Long functions that do one thing linearly (e.g. state machine, parser)
- Entry points that wire dependencies
- Single boolean for simple on/off state
