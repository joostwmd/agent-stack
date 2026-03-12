# Error Handling — dbSafe, PG Codes, tRPC Mapper, Retry

---

## PG Error Codes → Domain Errors

| Code | Class |
|------|-------|
| 23505 | UniqueViolationError |
| 23503 | ForeignKeyViolationError |
| 23502 | NotNullViolationError |
| 23514 | CheckViolationError |
| 40001 | SerializationError |
| 40P01 | DeadlockError |
| 57014 | QueryTimeoutError |
| 08xxx | ConnectionError |

---

## parseConstraintDetail

```typescript
function parseConstraintDetail(detail?: string): { column?: string; value?: string } {
  if (!detail) return {}
  const match = detail.match(/Key \((.+?)\)=\((.+?)\)/)
  return { column: match?.[1], value: match?.[2] }
}
```

---

## Error Classes (errors.ts)

Define: `DatabaseError`, `UniqueViolationError`, `ForeignKeyViolationError`, `NotNullViolationError`, `CheckViolationError`, `SerializationError`, `DeadlockError`, `QueryTimeoutError`, `ConnectionError`. Each extends `DatabaseError` with `code` and `cause`.

---

## dbSafe Implementation

```typescript
// src/lib/db/safety-net.ts
export async function dbSafe<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (err: any) {
    const pgCode = err?.code
    switch (pgCode) {
      case '23505':
        const { column, value } = parseConstraintDetail(err.detail)
        throw new UniqueViolationError({
          message: column ? `A record with this ${column} already exists` : 'Duplicate record',
          column, value, cause: err,
        })
      case '23503': throw new ForeignKeyViolationError('Referenced record does not exist', err)
      case '23502': throw new NotNullViolationError(`Missing required field: ${err.column}`, err.column ?? 'unknown', err)
      case '23514': throw new CheckViolationError('Data validation failed at database level', err)
      case '40001': throw new SerializationError(err)
      case '40P01': throw new DeadlockError(err)
      case '57014': throw new QueryTimeoutError(err)
      case '08006': case '08003': case '08001': case '53300':
        throw new ConnectionError('Database connection lost', err)
      default:
        if (pgCode) throw new DatabaseError(`Database error (code: ${pgCode})`, pgCode, err)
        throw err
    }
  }
}
```

---

## tRPC Error Mapper

`errorMapperMiddleware` maps: UniqueViolation → CONFLICT, ForeignKey/NotNull/Check → BAD_REQUEST, Serialization/Deadlock → CONFLICT, QueryTimeout → TIMEOUT, Connection/Database → INTERNAL_SERVER_ERROR.

Full implementation in api-agent's trpc middleware.

---

## withRetry (Serialization / Deadlock)

```typescript
// src/lib/db/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      if (!(err instanceof SerializationError || err instanceof DeadlockError) || attempt === maxAttempts) throw err
      const jitter = Math.random() * baseDelayMs
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1) + jitter))
    }
  }
  throw new Error('Unreachable')
}
```

Use for credit transfers, inventory updates with `isolationLevel: 'serializable'`.

---

## Savepoint (Partial Rollback)

When nested `withTransaction` must fail independently: add `useSavepoint: true`. Inner uses `existingTx.transaction(async (savepointTx) => transactionStorage.run(savepointTx, callback))`.
