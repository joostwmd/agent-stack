# DB Infrastructure Testing — dbSafe, withRetry, DbClient

## Key Insight

`dbSafe` and `withRetry` are pure logic — they only care about what is
thrown, not about real database connections. No PGlite needed. These are
fast unit tests and the highest-value Stryker targets in the codebase.

## dbSafe — Error Mapping

```ts
// tests/api/db/infra/safety-net.test.ts
import { dbSafe } from '@server/lib/db/safety-net'
import {
  UniqueViolationError,
  ForeignKeyViolationError,
  NotNullViolationError,
  CheckViolationError,
  SerializationError,
  DeadlockError,
  QueryTimeoutError,
  ConnectionError,
  DatabaseError,
} from '@server/lib/db/errors'

function pgError(code: string, detail?: string) {
  return Object.assign(new Error('pg error'), { code, detail })
}

describe('dbSafe', () => {
  it('passes through successful result', async () => {
    const result = await dbSafe(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('maps 23505 → UniqueViolationError', async () => {
    await expect(
      dbSafe(() => Promise.reject(
        pgError('23505', 'Key (email)=(alice@example.com) already exists')
      ))
    ).rejects.toBeInstanceOf(UniqueViolationError)
  })

  it('extracts column and value from 23505 detail', async () => {
    const err = await dbSafe(() =>
      Promise.reject(pgError('23505', 'Key (email)=(alice@example.com) already exists'))
    ).catch(e => e)

    expect(err.column).toBe('email')
    expect(err.value).toBe('alice@example.com')
  })

  it('maps 23503 → ForeignKeyViolationError', async () => {
    await expect(dbSafe(() => Promise.reject(pgError('23503'))))
      .rejects.toBeInstanceOf(ForeignKeyViolationError)
  })

  it('maps 23502 → NotNullViolationError', async () => {
    const err = Object.assign(pgError('23502'), { column: 'name' })
    await expect(dbSafe(() => Promise.reject(err)))
      .rejects.toBeInstanceOf(NotNullViolationError)
  })

  it('maps 40001 → SerializationError', async () => {
    await expect(dbSafe(() => Promise.reject(pgError('40001'))))
      .rejects.toBeInstanceOf(SerializationError)
  })

  it('maps 40P01 → DeadlockError', async () => {
    await expect(dbSafe(() => Promise.reject(pgError('40P01'))))
      .rejects.toBeInstanceOf(DeadlockError)
  })

  it('maps 57014 → QueryTimeoutError', async () => {
    await expect(dbSafe(() => Promise.reject(pgError('57014'))))
      .rejects.toBeInstanceOf(QueryTimeoutError)
  })

  it('maps 08006 → ConnectionError', async () => {
    await expect(dbSafe(() => Promise.reject(pgError('08006'))))
      .rejects.toBeInstanceOf(ConnectionError)
  })

  it('wraps unknown pg code in DatabaseError', async () => {
    await expect(dbSafe(() => Promise.reject(pgError('99999'))))
      .rejects.toBeInstanceOf(DatabaseError)
  })

  it('re-throws non-pg errors unchanged', async () => {
    const original = new TypeError('not a pg error')
    const thrown = await dbSafe(() => Promise.reject(original)).catch(e => e)
    expect(thrown).toBe(original)  // same reference
  })
})
```

## withRetry — Backoff and Attempt Logic

```ts
// tests/api/db/infra/retry.test.ts
import { withRetry } from '@server/lib/db/retry'
import { SerializationError, DeadlockError } from '@server/lib/db/errors'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const result = await withRetry(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('retries on SerializationError and eventually succeeds', async () => {
    let attempts = 0
    const result = await withRetry(() => {
      attempts++
      if (attempts < 3) throw new SerializationError(new Error())
      return Promise.resolve('ok')
    }, 3)

    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('retries on DeadlockError', async () => {
    let attempts = 0
    await withRetry(() => {
      attempts++
      if (attempts < 2) throw new DeadlockError(new Error())
      return Promise.resolve('ok')
    }, 3)
    expect(attempts).toBe(2)
  })

  it('throws after maxAttempts exhausted', async () => {
    await expect(
      withRetry(() => { throw new SerializationError(new Error()) }, 3)
    ).rejects.toBeInstanceOf(SerializationError)
  })

  it('does not retry on non-retryable errors', async () => {
    let attempts = 0
    await expect(
      withRetry(() => {
        attempts++
        throw new Error('unrelated error')
      }, 3)
    ).rejects.toThrow('unrelated error')
    expect(attempts).toBe(1)  // no retry
  })
})
```

## DbClient — withTransaction Nesting

```ts
// tests/api/db/infra/client.test.ts — needs PGlite
import { dbTest } from '@tests/_fixtures/db'
import { DbClient } from '@server/lib/db/client'

dbTest('withTransaction commits on success', async ({ db }) => {
  await db.withTransaction(async (tx) => {
    await tx.insert(users).values({ name: 'Alice', email: 'a@test.com' })
  })
  const rows = await db.select().from(users)
  expect(rows).toHaveLength(1)
})

dbTest('withTransaction rolls back on error', async ({ db }) => {
  await expect(
    db.withTransaction(async (tx) => {
      await tx.insert(users).values({ name: 'Alice', email: 'a@test.com' })
      throw new Error('forced')
    })
  ).rejects.toThrow('forced')

  const rows = await db.select().from(users)
  expect(rows).toHaveLength(0)
})

dbTest('nested withTransaction reuses outer transaction', async ({ db }) => {
  let outerTx: unknown
  let innerTx: unknown

  await db.withTransaction(async (tx) => {
    outerTx = tx
    await db.withTransaction(async (tx2) => {
      innerTx = tx2
    })
  })

  expect(innerTx).toBe(outerTx)
})
```
