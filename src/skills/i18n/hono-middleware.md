# Hono Locale Middleware — tRPC Context Bridge

Hono middleware for locale extraction and tRPC context integration following the established middleware pipeline pattern.

## Middleware Architecture

### 1. Locale Middleware Implementation

```typescript
// src/middleware/locale.ts
import { createMiddleware } from 'hono/factory'
import { isValidLocale, type Locale } from '@repo/shared/i18n/types'
import type { AppEnv } from '../types'

export const localeMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  // Extract locale from x-locale header
  const rawLocale = c.req.header('x-locale') ?? 'en'
  
  // Validate and fallback to English
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : 'en'
  
  // Set locale on Hono context for tRPC bridge
  c.set('locale', locale)
  
  // Log locale in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Locale] Request locale: ${rawLocale} -> ${locale}`)
  }
  
  await next()
})
```

### 2. Update App Environment Types

```typescript
// src/types.ts
import type { Locale } from '@repo/shared/i18n/types' // User's shared package

export interface AppEnv {
  Bindings: {
    // ... existing bindings
  }
  Variables: {
    session: Session | null
    user: User | null
    locale: Locale  // Add locale to Hono context variables
  }
}
```

### 3. tRPC Context Bridge

```typescript
// src/trpc/context.ts
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { AppEnv } from '../types'
import type { Locale } from '@repo/shared/i18n/types'

export function createContext(opts: FetchCreateContextFnOptions & { env: AppEnv }) {
  const { req, resHeaders } = opts
  
  // Get Hono context from request
  const c = opts.env
  
  // Extract locale set by localeMiddleware
  const locale: Locale = c.get('locale') ?? 'en'
  
  // Extract session set by sessionMiddleware
  const session = c.get('session')
  const user = c.get('user')
  
  return {
    req,
    resHeaders,
    locale,    // Available in all tRPC procedures
    session,
    user,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
```

### 4. Middleware Pipeline Integration

```typescript
// src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { trpcServer } from '@trpc/server/adapters/fetch'

import { auth } from '@repo/auth'
import { requestLogger } from './middleware/logger'
import { sessionMiddleware } from './middleware/session'
import { sentryUserContext } from './middleware/sentry'
import { localeMiddleware } from './middleware/locale'  // New locale middleware
import { appRouter } from './trpc/router'
import { createContext } from './trpc/context'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

// Middleware pipeline (ORDER MATTERS)
app.use('*', secureHeaders())
app.use('*', cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}))

// Better Auth routes (before session middleware)
app.use('/api/auth/**', auth.handler)

// Request logging
app.use('*', requestLogger())

// Locale extraction (BEFORE sessionMiddleware)
app.use('*', localeMiddleware)

// Session extraction (AFTER localeMiddleware)
app.use('*', sessionMiddleware)

// Sentry user context
app.use('*', sentryUserContext())

// tRPC server (consumes locale from context)
app.use('/api/trpc/**', 
  trpcServer({
    router: appRouter,
    createContext: (opts) => createContext({ ...opts, env: app }),
  })
)

// Health endpoints
app.get('/healthz', (c) => c.text('OK'))
app.get('/readyz', (c) => c.text('Ready'))

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default app
```

## Usage in tRPC Procedures

### 1. Basic Procedure with Localized Response

```typescript
// src/routers/items.ts
import { router, publicProcedure } from '../trpc/procedures'
import { t } from '@repo/shared/i18n/utils'
import { z } from 'zod'

export const itemsRouter = router({
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create item logic here
      const item = await createItem(input)
      
      return {
        item,
        message: t(ctx.locale, 'Item created successfully'), // Localized message
      }
    }),
    
  list: publicProcedure
    .query(async ({ ctx }) => {
      const items = await getItems()
      
      if (items.length === 0) {
        return {
          items: [],
          message: t(ctx.locale, 'No items found'), // Localized empty state
        }
      }
      
      return {
        items,
        message: t(ctx.locale, 'Found {{count}} items', { count: items.length }),
      }
    }),
})
```

### 2. Error Handling with Localized Messages

```typescript
// src/trpc/middleware/errorMapper.ts
import { TRPCError } from '@trpc/server'
import { t } from '@repo/shared/i18n/utils'
import type { Context } from '../context'

export function createLocalizedError(
  ctx: Context,
  code: TRPCError['code'],
  messageKey: string,
  interpolation?: Record<string, any>
) {
  return new TRPCError({
    code,
    message: t(ctx.locale, messageKey, interpolation),
  })
}

// Usage in procedures
export const deleteItem = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const item = await findItem(input.id)
    
    if (!item) {
      throw createLocalizedError(
        ctx,
        'NOT_FOUND',
        'Item not found'
      )
    }
    
    if (item.userId !== ctx.user?.id) {
      throw createLocalizedError(
        ctx,
        'FORBIDDEN',
        'You are not authorized to delete this item'
      )
    }
    
    await deleteItem(input.id)
    
    return {
      message: t(ctx.locale, 'Item deleted successfully'),
    }
  })
```

### 3. Validation with Localized Error Messages

```typescript
// src/lib/validation.ts
import { z } from 'zod'
import { t } from '@repo/shared/i18n/utils'
import type { Locale } from '@repo/shared/i18n/types'

export function createLocalizedSchema(locale: Locale) {
  return {
    email: z
      .string()
      .email(t(locale, 'Please enter a valid email address')),
      
    password: z
      .string()
      .min(8, t(locale, 'Password must be at least 8 characters long'))
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        t(locale, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
      ),
      
    name: z
      .string()
      .min(2, t(locale, 'Name must be at least 2 characters long'))
      .max(50, t(locale, 'Name must be less than 50 characters')),
  }
}

// Usage in procedures
export const updateProfile = protectedProcedure
  .input(z.object({
    name: z.string(),
    email: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Validate with localized messages
    const schema = z.object(createLocalizedSchema(ctx.locale))
    const validatedInput = schema.parse(input)
    
    // Update profile logic
    const profile = await updateUserProfile(ctx.user.id, validatedInput)
    
    return {
      profile,
      message: t(ctx.locale, 'Profile updated successfully'),
    }
  })
```

## Server-Side Translation Helper

```typescript
// src/lib/translation.ts
import { translations } from '@repo/shared/i18n/translations'
import type { Locale, TranslationKey } from '@repo/shared/i18n/types'

export function t(
  locale: Locale,
  key: TranslationKey,
  interpolation?: Record<string, string | number>
): string {
  const translation = translations[locale]?.[key] || translations.en[key] || key
  
  if (!interpolation) {
    return translation
  }
  
  // Handle interpolation
  return Object.entries(interpolation).reduce(
    (result, [variable, value]) => 
      result.replace(new RegExp(`{{${variable}}}`, 'g'), String(value)),
    translation
  )
}
```

## Middleware Order Rules

The locale middleware must run in this specific order:

```typescript
// ✅ Correct order
app.use('*', secureHeaders())
app.use('*', cors())
app.use('/api/auth/**', auth.handler)
app.use('*', requestLogger())
app.use('*', localeMiddleware)      // BEFORE sessionMiddleware
app.use('*', sessionMiddleware)     // AFTER localeMiddleware
app.use('*', sentryUserContext())
app.use('/api/trpc/**', trpcServer())

// ❌ Wrong order - locale after session
app.use('*', sessionMiddleware)
app.use('*', localeMiddleware)      // Too late - session already extracted
```

## Testing Locale Middleware

```typescript
// tests/middleware/locale.test.ts
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { localeMiddleware } from '../../src/middleware/locale'

describe('Locale Middleware', () => {
  it('should extract valid locale from header', async () => {
    const app = new Hono()
    app.use('*', localeMiddleware)
    app.get('/', (c) => c.json({ locale: c.get('locale') }))
    
    const res = await app.request('/', {
      headers: { 'x-locale': 'es' }
    })
    
    const data = await res.json()
    expect(data.locale).toBe('es')
  })
  
  it('should fallback to English for invalid locale', async () => {
    const app = new Hono()
    app.use('*', localeMiddleware)
    app.get('/', (c) => c.json({ locale: c.get('locale') }))
    
    const res = await app.request('/', {
      headers: { 'x-locale': 'invalid' }
    })
    
    const data = await res.json()
    expect(data.locale).toBe('en')
  })
  
  it('should default to English when no header provided', async () => {
    const app = new Hono()
    app.use('*', localeMiddleware)
    app.get('/', (c) => c.json({ locale: c.get('locale') }))
    
    const res = await app.request('/')
    
    const data = await res.json()
    expect(data.locale).toBe('en')
  })
})
```

This middleware setup provides clean separation of concerns where Hono handles HTTP-level locale extraction and tRPC procedures consume the locale through context.