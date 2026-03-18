# Model Factory — Entity Definitions & Runtime Classes

The model-factory provides schema factories and runtime base classes for consistent, multi-tenant entities. Use it for new app tables instead of manual Drizzle definitions.

---

## Overview

| Component | Purpose |
|-----------|----------|
| `defineStaticEntity` | Single-table entities (org/user/app scoped, optional soft-delete) |
| `defineVersionedEntity` | Three-table entities (base + versions + changes) with full audit trail |
| `StaticTable` | Runtime CRUD for static entities (get, getAll, create, update, delete) |
| `VersionedTable` | Runtime CRUD for versioned entities + history, changes, restore |

---

## Factory Functions

### defineStaticEntity

Creates a single Drizzle table with standardized columns. Choose scope and soft-delete.

```typescript
import { defineStaticEntity } from "@repo/model-factory";
import { text } from "drizzle-orm/pg-core";

export const categories = defineStaticEntity({
  name: "categories",
  columns: {
    name: text("name").notNull(),
    color: text("color"),
  },
  scope: "org",      // "org" | "user" | "org-user" | "app"
  softDelete: true,
});
```

**Scopes:**

| scope | Columns added | Use case |
|-------|---------------|----------|
| `org` | organisationId | Organisation-scoped (most common) |
| `user` | userId | User-scoped (e.g. preferences) |
| `org-user` | organisationId, userId | Scoped to both |
| `app` | none | Global application data |

**System columns (never set manually):** `id`, `organisationId`, `userId`, `createdAt`, `updatedAt`, `deletedAt`

---

### defineVersionedEntity

Creates base + versions + changes tables with relations. Use for entities that need full audit history.

```typescript
import { defineVersionedEntity } from "@repo/model-factory";
import { text } from "drizzle-orm/pg-core";

const {
  base: tasks,
  versions: taskVersions,
  changes: taskChanges,
  baseRelations: tasksRelations,
  versionsRelations: taskVersionsRelations,
  changesRelations: taskChangesRelations,
} = defineVersionedEntity({
  name: "tasks",
  baseColumns: { title: text("title").notNull() },      // Immutable fields
  versionColumns: {                                     // Mutable fields
    name: text("name").notNull(),
    description: text("description"),
  },
});
```

- **base**: Entity metadata + currentVersionId pointer. Immutable fields only.
- **versions**: All historical versions of mutable data.
- **changes**: Audit log (create, update, delete, restore) with actorUserId, actorUserName, actorUserEmail.

---

## Runtime Classes

Runtime classes require **Transact** and **Session** via constructor. The app must provide these (see transaction.md for Transact, auth for Session).

### Session Type

```typescript
interface Session {
  user: { id: string; name: string; email: string };
  organisationId: string;
}
```

Any auth session (e.g. Better Auth) that satisfies this shape works.

### StaticTable

Extend for static entity repositories.

```typescript
import { StaticTable } from "@repo/model-factory";
import type { Transact } from "@repo/db/transaction";
import type { Session } from "@repo/model-factory";
import { categories } from "./schema";

export class CategoryRepository extends StaticTable<typeof categories> {
  protected readonly table = categories;
  protected readonly config = { scope: "org" as const, softDelete: true };

  constructor(transact: Transact, session: Session) {
    super(transact, session);
  }
}
```

**Methods:** `get(id)`, `getOrThrow(id)`, `getAll()`, `getAllByUserId(userId)`, `create(data)`, `update(id, data)`, `delete(id)`.

**create/update rules:** Do not pass system keys. Scoping and timestamps are injected from session.

```typescript
// ✅ Correct — only business fields
await repo.create({ name: "Design", color: "#333" });

// ❌ Wrong — system keys rejected
await repo.create({ id: "...", organisationId: "...", createdAt: ... });
```

---

### VersionedTable

Extend for versioned entity repositories.

```typescript
import { VersionedTable } from "@repo/model-factory";
import type { Transact } from "@repo/db/transaction";
import type { Session } from "@repo/model-factory";
import { tasks, taskVersions, taskChanges } from "./schema";

export class TaskRepository extends VersionedTable<
  typeof tasks,
  typeof taskVersions,
  typeof taskChanges
> {
  protected readonly table = tasks;
  protected readonly versionsTable = taskVersions;
  protected readonly changesTable = taskChanges;
  protected readonly config = { scope: "org" as const, softDelete: true };

  constructor(transact: Transact, session: Session) {
    super(transact, session);
  }
}
```

**Methods:** `get(id)`, `getOrThrow(id)`, `getAll()`, `history(entityId)`, `changes(entityId)`, `getVersion(versionId)`, `create(data)`, `update(id, data)`, `delete(id)`, `restore(id)`.

---

## Integration with tx / withTransaction

The **Transact** type is a function: `(callback: (tx: DrizzleExecutor) => Promise<T>) => Promise<T>`. Wire it to the app's transaction system:

```typescript
// src/lib/db/transaction.ts — extend to export Transact
import { transactionStorage } from "./transaction"; // AsyncLocalStorage

export type Transact = <T>(
  callback: (tx: DrizzleTransaction) => Promise<T>
) => Promise<T>;

export function createTransact(db: typeof database): Transact {
  return async (callback) => {
    const existing = transactionStorage.getStore();
    if (existing) return callback(existing);
    return db.transaction(async (tx) => transactionStorage.run(tx, () => callback(tx)));
  };
}
```

Services pass the transact wrapper and session to repositories:

```typescript
const transact = createTransact(db);
const repo = new CategoryRepository(transact, session);
await repo.create({ name: "Design" });
```

---

## SYSTEM_KEYS

These columns are managed by the framework. Never set manually:

```
id, entityId, organisationId, userId, versionNumber,
currentVersionId, createdAt, updatedAt, deletedAt
```

Use `OmitSystemKeys<T>` for create/update input types.

---

## App Schema Wiring

1. Define entities with `defineStaticEntity` or `defineVersionedEntity`.
2. Export from `app-schema.ts` and add to schema barrel.
3. Add relations (factory provides them for versioned entities).
4. Create drizzle-zod schemas from tables for tRPC input validation.
5. Run migrations: `npx drizzle-kit generate` and `drizzle-kit migrate`.
