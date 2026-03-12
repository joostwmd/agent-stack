# Migrations — Drizzle Kit & Better Auth

---

## drizzle.config.ts

```typescript
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
})
```

---

## Commands

```bash
npx drizzle-kit generate   # From schema changes
npx drizzle-kit migrate     # Apply
npx drizzle-kit push        # Dev only — no migration files
npx drizzle-kit studio      # Visual browser
```

---

## Better Auth Schema Changes

When Better Auth schema changes (plugins, new features):

1. `npx @better-auth/cli generate --output src/lib/db/auth-schema.ts`
2. `npx drizzle-kit generate`
3. `npx drizzle-kit migrate`
