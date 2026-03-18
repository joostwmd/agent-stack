# i18n Skills — Internationalization with English-as-Keys

## Architecture
```
React Client (i18next) -> x-locale header -> Hono localeMiddleware -> tRPC context -> Procedures
       |                                                                    |
       v                                                                    v
  useTranslation                                                     t(ctx.locale, key)
       |                                                                    |
       v                                                                    v
  Hardcoded translations  <-- Shared translation resources -->  Server translations
```

Frontend i18next + Backend tRPC context = Full-stack internationalization with hardcoded resources.

## Core Rules (Always Apply)
- **English-as-keys**: Use full English text as translation keys, not short keys like "welcome.title"
- **Hardcoded resources**: No HTTP backends, all translations bundled with application
- **Middleware pipeline**: Locale middleware extracts x-locale header, passes to tRPC via context
- **Fallback to English**: Invalid locales always fallback to 'en', never throw on missing translations
- **Shared resources**: Frontend and backend use same translation files from shared package
- **Type safety**: All translation functions fully typed with locale and key inference
- **AI-friendly**: Translation keys provide full context for AI translation workflows

## File Map (User Application)
```
packages/shared/i18n/          -- Shared i18n package (user's monorepo)
  types.ts                    -- Locale types, interfaces
  translations.ts             -- Hardcoded translation resources
  utils.ts                    -- Translation helper functions
  index.ts                    -- Package exports
src/middleware/
  locale.ts                   -- Hono locale middleware
src/lib/
  i18n.ts                     -- i18next configuration
  translation.ts              -- Server-side helpers
```

## Skill Routing
| When working on... | Load this skill |
|---|---|
| Initial setup, English-as-keys configuration, i18next init | setup.md |
| React integration, useTranslation, Trans component, language switching | react-integration.md |
| Hono middleware, tRPC context bridge, locale extraction | hono-middleware.md |
| Adding languages, managing translations, hardcoded resources | translation-management.md |
| TypeScript types, key inference, type-safe helpers | typescript-setup.md |
| AI translation workflows, extraction, validation | ai-translation.md |

## Translation Pattern (Quick Reference)
```typescript
// ✅ English-as-keys pattern
t('Welcome to our application')
t('You have {{count}} unread messages')
t('Please check your email for verification')

// ❌ Short keys (avoid)
t('welcome.title')
t('messages.count')
t('auth.verify')
```

## Middleware Order
```
secureHeaders -> cors -> auth.handler -> requestLogger -> localeMiddleware -> sessionMiddleware -> sentryUserContext -> trpcServer
```

## Context Flow
```typescript
// 1. Hono middleware extracts header
c.set('locale', validatedLocale)

// 2. tRPC context reads from Hono
const locale = c.get('locale')

// 3. Procedures use context locale
t(ctx.locale, 'Operation completed successfully')
```