# i18n Setup — English-as-Keys Configuration

Initial internationalization setup with hardcoded translations using English text as translation keys.

## Core Configuration Pattern

### 1. i18next Configuration with English-as-Keys

```typescript
// src/lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translations } from '@repo/shared/i18n/translations'

i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    // CRITICAL: Enable English-as-keys pattern
    nsSeparator: false,      // Allow ':' in keys
    keySeparator: false,     // Allow '.' in keys
    
    // Use hardcoded resources (no HTTP backend)
    resources: {
      en: { translation: translations.en },
      es: { translation: translations.es },
      fr: { translation: translations.fr },
      de: { translation: translations.de },
    },

    // React-specific options
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },
  })

export default i18n
```

### 2. Shared Package Structure

First, create the shared i18n package structure in the user's application:

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

### 3. Translation Resource Structure

```typescript
// packages/shared/i18n/translations.ts
import type { Locale } from './types'

export const translations = {
  en: {
    // Use full English sentences as keys
    'Welcome to our application': 'Welcome to our application',
    'You have {{count}} unread messages': 'You have {{count}} unread messages',
    'Please check your email for verification': 'Please check your email for verification',
    'Item created successfully': 'Item created successfully',
    'Resource not found': 'Resource not found',
    'You are not authorized to perform this action': 'You are not authorized to perform this action',
    
    // Complex translations with HTML
    'By clicking continue, you agree to our <strong>Terms of Service</strong>': 'By clicking continue, you agree to our <strong>Terms of Service</strong>',
    
    // Pluralization
    'You have {{count}} item': 'You have {{count}} item',
    'You have {{count}} item_other': 'You have {{count}} items',
  },
  es: {
    'Welcome to our application': 'Bienvenido a nuestra aplicación',
    'You have {{count}} unread messages': 'Tienes {{count}} mensajes sin leer',
    'Please check your email for verification': 'Por favor revisa tu correo para verificación',
    'Item created successfully': 'Elemento creado exitosamente',
    'Resource not found': 'Recurso no encontrado',
    'You are not authorized to perform this action': 'No tienes autorización para realizar esta acción',
    
    'By clicking continue, you agree to our <strong>Terms of Service</strong>': 'Al hacer clic en continuar, aceptas nuestros <strong>Términos de Servicio</strong>',
    
    'You have {{count}} item': 'Tienes {{count}} elemento',
    'You have {{count}} item_other': 'Tienes {{count}} elementos',
  },
  fr: {
    'Welcome to our application': 'Bienvenue dans notre application',
    'You have {{count}} unread messages': 'Vous avez {{count}} messages non lus',
    'Please check your email for verification': 'Veuillez vérifier votre email pour la vérification',
    'Item created successfully': 'Élément créé avec succès',
    'Resource not found': 'Ressource introuvable',
    'You are not authorized to perform this action': 'Vous n\'êtes pas autorisé à effectuer cette action',
    
    'By clicking continue, you agree to our <strong>Terms of Service</strong>': 'En cliquant sur continuer, vous acceptez nos <strong>Conditions de Service</strong>',
    
    'You have {{count}} item': 'Vous avez {{count}} élément',
    'You have {{count}} item_other': 'Vous avez {{count}} éléments',
  },
} satisfies Record<Locale, Record<string, string>>
```

### 4. Translation Utilities

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
```

### 5. Package Index File

```typescript
// packages/shared/i18n/index.ts
// Re-export all types and utilities for easy importing
export * from './types'
export * from './translations'
export * from './utils'

// Default exports for convenience
export { translations as default } from './translations'
```

## Installation Dependencies

```bash
# Frontend dependencies
npm install i18next react-i18next

# No backend dependencies needed (uses shared translations)
```

## Key Benefits of English-as-Keys

1. **Self-documenting**: Keys explain what they translate to
2. **AI-friendly**: Full context available for AI translation
3. **Fallback built-in**: Missing translations show readable English
4. **Developer experience**: No need to look up what keys mean
5. **Refactoring safe**: Changing text changes the key, preventing stale translations

## Configuration Rules

- **Always set** `nsSeparator: false` and `keySeparator: false`
- **Always set** `fallbackLng: 'en'` for missing translations
- **Never use** HTTP backends or dynamic loading
- **Always validate** locale input with `isValidLocale()`
- **Always provide** English version of every key
- **Use interpolation** `{{variable}}` for dynamic content
- **Use pluralization** `_other` suffix for plural forms

## Common Patterns

### Interpolation
```typescript
// Template
'Hello {{name}}, welcome back!'

// Usage
t('Hello {{name}}, welcome back!', { name: 'John' })
```

### Pluralization
```typescript
// Singular key
'You have {{count}} item'

// Plural key (add _other suffix)
'You have {{count}} item_other'

// Usage
t('You have {{count}} item', { count: 1 })  // singular
t('You have {{count}} item', { count: 5 })  // plural
```

### HTML in Translations
```typescript
// Key with HTML
'Please <strong>verify</strong> your email'

// Usage with Trans component
<Trans i18nKey="Please <strong>verify</strong> your email" />
```

This setup provides the foundation for type-safe, AI-friendly internationalization across your entire stack.