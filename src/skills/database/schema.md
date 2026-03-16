# Schema — Better Auth + App Tables

Auth schema is generated; app schema extends it and references `users`.

---

## Generate Better Auth Schema

```bash
npx @better-auth/cli generate --output src/lib/db/auth-schema.ts
```

---

## App Schema — Extend Auth

```typescript
// src/lib/db/app-schema.ts
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { users } from './auth-schema'

export const posts = pgTable('posts', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:     text('title').notNull(),
  content:   text('content'),
  published: boolean('published').notNull().default(false),
  authorId:  text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('posts_author_id_idx').on(table.authorId),
  index('posts_created_at_idx').on(table.createdAt),
])
```

Import `index` from `drizzle-orm/pg-core`. Barrel: `schema.ts` exports auth + app.

---

## Relations

```typescript
// src/lib/db/relations.ts
import { relations } from 'drizzle-orm'
import { users, posts } from './schema'

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}))
```

Required for `tx.query.*` with `with`.

---

## drizzle-zod

```typescript
// src/lib/db/zod.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { users, posts } from './schema'
import { z } from 'zod'

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  name: z.string().min(1).max(100),
})
export const selectUserSchema = createSelectSchema(users)
export const insertPostSchema = createInsertSchema(posts, { title: z.string().min(1).max(200) })
export const selectPostSchema = createSelectSchema(posts)
```

Use for tRPC `.input()` and `.output()`.
