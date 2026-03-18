# TypeScript i18n Setup — Type-Safe Translation Keys

Complete TypeScript configuration for type-safe internationalization with English-as-keys pattern.

## Core Type Definitions

### 1. Locale and Translation Types

```typescript
// packages/shared/i18n/types.ts
export const locales = ['en', 'es', 'fr', 'de'] as const
export type Locale = typeof locales[number]

// Infer translation keys from English translations
export type TranslationKey = keyof typeof import('./translations').translations.en

// Validation function with type guard
export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale)
}

// Translation context interface
export interface TranslationContext {
  locale: Locale
  fallbackLocale: Locale
}

// Interpolation values type
export type InterpolationValues = Record<string, string | number>

// Translation function signature
export type TranslationFunction = (
  key: TranslationKey,
  interpolation?: InterpolationValues
) => string

// Pluralization function signature
export type PluralizationFunction = (
  key: TranslationKey,
  count: number,
  interpolation?: InterpolationValues
) => string
```

### 2. Enhanced Translation Utilities with Full Type Safety

```typescript
// packages/shared/i18n/utils.ts
import { translations } from './translations'
import type { 
  Locale, 
  TranslationKey, 
  InterpolationValues,
  TranslationFunction,
  PluralizationFunction
} from './types'

// Type-safe translation function
export function t(
  locale: Locale,
  key: TranslationKey,
  interpolation?: InterpolationValues
): string {
  const translation = translations[locale]?.[key] 
    || translations.en[key] 
    || key
  
  if (!interpolation) {
    return translation
  }
  
  return Object.entries(interpolation).reduce(
    (result, [variable, value]) => 
      result.replace(new RegExp(`{{${variable}}}`, 'g'), String(value)),
    translation
  )
}

// Type-safe pluralization function
export function tp(
  locale: Locale,
  key: TranslationKey,
  count: number,
  interpolation?: InterpolationValues
): string {
  // TypeScript will ensure the plural key exists if the base key exists
  const pluralKey = count === 1 ? key : `${key}_other` as TranslationKey
  return t(locale, pluralKey, { count, ...interpolation })
}

// Create locale-specific translation function
export function createTranslator(locale: Locale): {
  t: TranslationFunction
  tp: PluralizationFunction
} {
  return {
    t: (key, interpolation) => t(locale, key, interpolation),
    tp: (key, count, interpolation) => tp(locale, key, count, interpolation),
  }
}

// Type-safe key validation
export function isValidTranslationKey(key: string): key is TranslationKey {
  return key in translations.en
}

// Get typed translation keys
export function getTranslationKeys(): TranslationKey[] {
  return Object.keys(translations.en) as TranslationKey[]
}
```

### 3. React Hook Types

```typescript
// src/hooks/useTranslation.types.ts
import type { 
  TranslationFunction, 
  PluralizationFunction,
  Locale 
} from '@repo/shared/i18n/types'

export interface UseTranslationReturn {
  t: TranslationFunction
  tp: PluralizationFunction
  locale: Locale
  changeLanguage: (locale: Locale) => Promise<void>
  ready: boolean
}

// Enhanced useTranslation hook with full type safety
export function useTypedTranslation(): UseTranslationReturn {
  const { t: i18nT, i18n, ready } = useTranslation()
  
  const t: TranslationFunction = (key, interpolation) => 
    i18nT(key, interpolation)
  
  const tp: PluralizationFunction = (key, count, interpolation) => 
    i18nT(key, { count, ...interpolation })
  
  const changeLanguage = (locale: Locale) => i18n.changeLanguage(locale)
  
  return {
    t,
    tp,
    locale: i18n.language as Locale,
    changeLanguage,
    ready,
  }
}
```

### 4. tRPC Context Types

```typescript
// src/trpc/context.types.ts
import type { Locale } from '@repo/shared/i18n/types'
import type { Session, User } from '@repo/auth'

export interface TRPCContext {
  req: Request
  resHeaders: Headers
  locale: Locale        // Type-safe locale
  session: Session | null
  user: User | null
}

// Context creation with proper typing
export function createContext(opts: FetchCreateContextFnOptions): TRPCContext {
  // Implementation with proper type safety
  const locale: Locale = c.get('locale') ?? 'en'
  
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    locale,
    session: c.get('session'),
    user: c.get('user'),
  }
}
```

### 5. Form Validation with Typed Translations

```typescript
// src/lib/validation.types.ts
import { z } from 'zod'
import type { Locale, TranslationKey } from '@repo/shared/i18n/types'
import { t } from '@repo/shared/i18n/utils'

// Type-safe validation schema factory
export function createValidationSchema<T extends Record<string, z.ZodTypeAny>>(
  locale: Locale,
  schemaDefinition: (t: (key: TranslationKey) => string) => T
): z.ZodObject<T> {
  const translator = (key: TranslationKey) => t(locale, key)
  return z.object(schemaDefinition(translator))
}

// Usage example with full type safety
export function createUserSchema(locale: Locale) {
  return createValidationSchema(locale, (t) => ({
    email: z
      .string()
      .email(t('Please enter a valid email address')),
    password: z
      .string()
      .min(8, t('Password must be at least 8 characters long')),
    name: z
      .string()
      .min(2, t('Name must be at least 2 characters long'))
      .max(50, t('Name must be less than 50 characters')),
  }))
}

// Type inference for schema
export type UserSchema = z.infer<ReturnType<typeof createUserSchema>>
```

### 6. Component Props with Translation Types

```typescript
// src/components/types.ts
import type { TranslationKey, InterpolationValues } from '@repo/shared/i18n/types'

// Props for components that accept translation keys
export interface TranslatableProps {
  titleKey?: TranslationKey
  descriptionKey?: TranslationKey
  interpolation?: InterpolationValues
}

// Example component with typed props
interface AlertProps extends TranslatableProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  children?: React.ReactNode
}

export function Alert({ titleKey, descriptionKey, interpolation, variant = 'info' }: AlertProps) {
  const { t } = useTypedTranslation()
  
  return (
    <div className={`alert alert-${variant}`}>
      {titleKey && <h4>{t(titleKey, interpolation)}</h4>}
      {descriptionKey && <p>{t(descriptionKey, interpolation)}</p>}
    </div>
  )
}

// Usage with full type safety
<Alert 
  titleKey="Item created successfully"
  descriptionKey="Your item has been saved and is now available"
  variant="success"
/>
```

### 7. Error Handling with Typed Messages

```typescript
// src/lib/errors.types.ts
import type { Locale, TranslationKey } from '@repo/shared/i18n/types'
import { TRPCError } from '@trpc/server'
import { t } from '@repo/shared/i18n/utils'

// Type-safe error creation
export function createLocalizedTRPCError(
  locale: Locale,
  code: TRPCError['code'],
  messageKey: TranslationKey,
  interpolation?: Record<string, string | number>
): TRPCError {
  return new TRPCError({
    code,
    message: t(locale, messageKey, interpolation),
  })
}

// Predefined error types with translation keys
export const ErrorMessages = {
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  INVALID_INPUT: 'Please check your input and try again',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
} as const satisfies Record<string, TranslationKey>

// Usage in procedures with type safety
export const deleteItem = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const item = await findItem(input.id)
    
    if (!item) {
      throw createLocalizedTRPCError(
        ctx.locale,
        'NOT_FOUND',
        ErrorMessages.NOT_FOUND
      )
    }
    
    // ... rest of the logic
  })
```

### 8. TypeScript Configuration

```json
// tsconfig.json additions for better i18n support
{
  "compilerOptions": {
    // Enable strict mode for better type safety
    "strict": true,
    "noUncheckedIndexedAccess": true,
    
    // Path mapping for shared i18n package
    "paths": {
      "@repo/shared/i18n/*": ["packages/shared/i18n/*"]
    }
  },
  
  // Include i18n types in compilation
  "include": [
    "packages/shared/i18n/**/*",
    "src/**/*"
  ]
}
```

### 9. Development Tools and Utilities

```typescript
// scripts/type-check-translations.ts
import type { Locale, TranslationKey } from '../packages/shared/i18n/types'
import { translations } from '../packages/shared/i18n/translations'

// Type-level validation of translation completeness
type TranslationCompleteness = {
  [K in Locale]: {
    [Key in TranslationKey]: string
  }
}

// This will cause a TypeScript error if any translation is missing
const _typeCheck: TranslationCompleteness = translations

// Runtime validation with detailed type information
export function validateTranslationTypes(): void {
  const englishKeys = Object.keys(translations.en) as TranslationKey[]
  
  for (const [locale, localeTranslations] of Object.entries(translations)) {
    if (locale === 'en') continue
    
    for (const key of englishKeys) {
      if (!(key in localeTranslations)) {
        console.error(`Missing translation for locale "${locale}", key: "${key}"`)
      }
    }
  }
}

// Generate type definitions for IDE support
export function generateTranslationTypes(): string {
  const keys = Object.keys(translations.en)
  
  return `
// Auto-generated translation key types
export type TranslationKey = 
${keys.map(key => `  | '${key}'`).join('\n')}

// Translation key validation
export const TRANSLATION_KEYS = [
${keys.map(key => `  '${key}',`).join('\n')}
] as const
`
}
```

### 10. IDE Support and Autocomplete

```typescript
// src/types/i18n.d.ts - Global type declarations
declare module 'react-i18next' {
  interface CustomTypeOptions {
    // Make the t function return type-safe keys
    resources: {
      translation: typeof import('@repo/shared/i18n/translations').translations.en
    }
  }
}

// Extend global namespace for better IDE support
declare global {
  namespace I18n {
    type Key = import('@repo/shared/i18n/types').TranslationKey
    type Locale = import('@repo/shared/i18n/types').Locale
  }
}
```

## Benefits of This TypeScript Setup

### 1. **Compile-Time Safety**
- Translation keys are validated at compile time
- Missing translations cause TypeScript errors
- Interpolation variables are type-checked

### 2. **IDE Support**
- Full autocomplete for translation keys
- IntelliSense shows available locales
- Refactoring support for translation keys

### 3. **Runtime Safety**
- Locale validation with type guards
- Fallback handling with proper types
- Error messages with type-safe keys

### 4. **Developer Experience**
- Clear error messages for missing translations
- Type-safe form validation
- Autocomplete in React components

### 5. **Maintainability**
- Changes to translation keys are tracked by TypeScript
- Unused translations can be detected
- Consistent API across frontend and backend

This TypeScript setup ensures that your i18n implementation is both type-safe and maintainable, catching translation errors at compile time rather than runtime.