# Connection — Pool & Better Auth Wiring

One db instance, shared with Better Auth. No separate connections for auth.

---

## Pool Setup

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import * as relations from './relations'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30_000,
})
pool.on('error', (err) => console.error('Unexpected pool error', err))

export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
  logger: process.env.NODE_ENV === 'development',
})
export { pool }
```

---

## Better Auth — Same db Instance

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  // ...
})
```

The adapter uses the same pool — no extra connections.

---

## Graceful Shutdown

```typescript
// server.ts
import { pool } from './lib/db'

process.on('SIGTERM', async () => {
  await pool.end()
  process.exit(0)
})
process.on('SIGINT', async () => {
  await pool.end()
  process.exit(0)
})
```
