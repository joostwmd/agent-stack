# Translation Management — Hardcoded Resources & AI Workflows

Managing hardcoded translation resources with English-as-keys pattern and AI-assisted translation workflows.

## Translation Resource Structure

### 1. Core Translation File Organization

```typescript
// packages/shared/i18n/translations.ts
import type { Locale } from './types'

// Primary translation structure with English as the source
export const translations = {
  // English (source language) - keys are the values
  en: {
    // Authentication & Authorization
    'Welcome back! Please sign in to your account': 'Welcome back! Please sign in to your account',
    'Invalid email or password': 'Invalid email or password',
    'You are not authorized to perform this action': 'You are not authorized to perform this action',
    'Please verify your email address': 'Please verify your email address',
    
    // CRUD Operations
    'Item created successfully': 'Item created successfully',
    'Item updated successfully': 'Item updated successfully',
    'Item deleted successfully': 'Item deleted successfully',
    'Resource not found': 'Resource not found',
    
    // Form Validation
    'Please enter a valid email address': 'Please enter a valid email address',
    'Password must be at least 8 characters long': 'Password must be at least 8 characters long',
    'Name must be between 2 and 50 characters': 'Name must be between 2 and 50 characters',
    
    // Pluralization (count-based)
    'You have {{count}} notification': 'You have {{count}} notification',
    'You have {{count}} notification_other': 'You have {{count}} notifications',
    'Found {{count}} result': 'Found {{count}} result',
    'Found {{count}} result_other': 'Found {{count}} results',
    
    // Complex content with HTML
    'By clicking continue, you agree to our <strong>Terms of Service</strong> and <link>Privacy Policy</link>': 'By clicking continue, you agree to our <strong>Terms of Service</strong> and <link>Privacy Policy</link>',
    
    // Interpolated messages
    'Hello {{name}}, welcome to {{appName}}!': 'Hello {{name}}, welcome to {{appName}}!',
    'Your subscription expires on {{date}}': 'Your subscription expires on {{date}}',
    'Processing {{current}} of {{total}} items...': 'Processing {{current}} of {{total}} items...',
  },
  
  // Spanish translations
  es: {
    'Welcome back! Please sign in to your account': '¡Bienvenido de vuelta! Por favor inicia sesión en tu cuenta',
    'Invalid email or password': 'Email o contraseña inválidos',
    'You are not authorized to perform this action': 'No tienes autorización para realizar esta acción',
    'Please verify your email address': 'Por favor verifica tu dirección de correo electrónico',
    
    'Item created successfully': 'Elemento creado exitosamente',
    'Item updated successfully': 'Elemento actualizado exitosamente',
    'Item deleted successfully': 'Elemento eliminado exitosamente',
    'Resource not found': 'Recurso no encontrado',
    
    'Please enter a valid email address': 'Por favor ingresa una dirección de correo válida',
    'Password must be at least 8 characters long': 'La contraseña debe tener al menos 8 caracteres',
    'Name must be between 2 and 50 characters': 'El nombre debe tener entre 2 y 50 caracteres',
    
    'You have {{count}} notification': 'Tienes {{count}} notificación',
    'You have {{count}} notification_other': 'Tienes {{count}} notificaciones',
    'Found {{count}} result': 'Se encontró {{count}} resultado',
    'Found {{count}} result_other': 'Se encontraron {{count}} resultados',
    
    'By clicking continue, you agree to our <strong>Terms of Service</strong> and <link>Privacy Policy</link>': 'Al hacer clic en continuar, aceptas nuestros <strong>Términos de Servicio</strong> y <link>Política de Privacidad</link>',
    
    'Hello {{name}}, welcome to {{appName}}!': '¡Hola {{name}}, bienvenido a {{appName}}!',
    'Your subscription expires on {{date}}': 'Tu suscripción expira el {{date}}',
    'Processing {{current}} of {{total}} items...': 'Procesando {{current}} de {{total}} elementos...',
  },
  
  // French translations
  fr: {
    'Welcome back! Please sign in to your account': 'Bon retour ! Veuillez vous connecter à votre compte',
    'Invalid email or password': 'Email ou mot de passe invalide',
    'You are not authorized to perform this action': 'Vous n\'êtes pas autorisé à effectuer cette action',
    'Please verify your email address': 'Veuillez vérifier votre adresse email',
    
    'Item created successfully': 'Élément créé avec succès',
    'Item updated successfully': 'Élément mis à jour avec succès',
    'Item deleted successfully': 'Élément supprimé avec succès',
    'Resource not found': 'Ressource introuvable',
    
    'Please enter a valid email address': 'Veuillez saisir une adresse email valide',
    'Password must be at least 8 characters long': 'Le mot de passe doit contenir au moins 8 caractères',
    'Name must be between 2 and 50 characters': 'Le nom doit contenir entre 2 et 50 caractères',
    
    'You have {{count}} notification': 'Vous avez {{count}} notification',
    'You have {{count}} notification_other': 'Vous avez {{count}} notifications',
    'Found {{count}} result': '{{count}} résultat trouvé',
    'Found {{count}} result_other': '{{count}} résultats trouvés',
    
    'By clicking continue, you agree to our <strong>Terms of Service</strong> and <link>Privacy Policy</link>': 'En cliquant sur continuer, vous acceptez nos <strong>Conditions de Service</strong> et <link>Politique de Confidentialité</link>',
    
    'Hello {{name}}, welcome to {{appName}}!': 'Bonjour {{name}}, bienvenue sur {{appName}} !',
    'Your subscription expires on {{date}}': 'Votre abonnement expire le {{date}}',
    'Processing {{current}} of {{total}} items...': 'Traitement de {{current}} sur {{total}} éléments...',
  },
} satisfies Record<Locale, Record<string, string>>
```

### 2. Translation Utilities

```typescript
// packages/shared/i18n/utils.ts
import { translations } from './translations'
import type { Locale, TranslationKey } from './types'

export function t(
  locale: Locale,
  key: TranslationKey,
  interpolation?: Record<string, string | number>
): string {
  // Get translation or fallback to English or key itself
  const translation = translations[locale]?.[key] 
    || translations.en[key] 
    || key
  
  if (!interpolation) {
    return translation
  }
  
  // Handle interpolation variables
  return Object.entries(interpolation).reduce(
    (result, [variable, value]) => 
      result.replace(new RegExp(`{{${variable}}}`, 'g'), String(value)),
    translation
  )
}

// Pluralization helper
export function tp(
  locale: Locale,
  key: TranslationKey,
  count: number,
  interpolation?: Record<string, string | number>
): string {
  const pluralKey = count === 1 ? key : `${key}_other` as TranslationKey
  return t(locale, pluralKey, { count, ...interpolation })
}

// Check if translation exists
export function hasTranslation(locale: Locale, key: string): boolean {
  return key in (translations[locale] || {})
}

// Get all available locales
export function getAvailableLocales(): Locale[] {
  return Object.keys(translations) as Locale[]
}

// Get translation completion percentage
export function getTranslationCompletion(locale: Locale): number {
  if (locale === 'en') return 100
  
  const englishKeys = Object.keys(translations.en)
  const localeKeys = Object.keys(translations[locale] || {})
  
  return Math.round((localeKeys.length / englishKeys.length) * 100)
}
```

## AI-Assisted Translation Workflows

### 1. Translation Extraction Script

```typescript
// scripts/extract-translations.ts
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import * as ts from 'typescript'

interface ExtractedTranslation {
  key: string
  file: string
  line: number
  context: string
}

export async function extractTranslations(): Promise<ExtractedTranslation[]> {
  const files = await glob('src/**/*.{ts,tsx}')
  const translations: ExtractedTranslation[] = []
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)
    
    function visit(node: ts.Node) {
      // Look for t('...') calls
      if (ts.isCallExpression(node) && 
          ts.isIdentifier(node.expression) && 
          node.expression.text === 't' &&
          node.arguments.length > 0) {
        
        const firstArg = node.arguments[0]
        if (ts.isStringLiteral(firstArg)) {
          const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          const context = content.split('\n')[lineNumber - 1]?.trim() || ''
          
          translations.push({
            key: firstArg.text,
            file,
            line: lineNumber,
            context
          })
        }
      }
      
      ts.forEachChild(node, visit)
    }
    
    visit(sourceFile)
  }
  
  return translations
}

// Usage
if (require.main === module) {
  extractTranslations().then(translations => {
    writeFileSync(
      'translations-extracted.json',
      JSON.stringify(translations, null, 2)
    )
    console.log(`Extracted ${translations.length} translation keys`)
  })
}
```

### 2. AI Translation Generation

```typescript
// scripts/ai-translate.ts
import { readFileSync, writeFileSync } from 'fs'
import type { Locale } from '../packages/shared/i18n/types'

interface TranslationRequest {
  sourceLocale: 'en'
  targetLocale: Locale
  translations: Record<string, string>
}

export function generateAITranslationPrompt(
  sourceTranslations: Record<string, string>,
  targetLocale: Locale
): string {
  const localeNames = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
  }
  
  const localeName = localeNames[targetLocale] || targetLocale
  
  return `
Translate the following English phrases to ${localeName}. 

CRITICAL REQUIREMENTS:
1. Maintain all interpolation variables exactly: {{variable}}
2. Preserve HTML tags exactly: <strong>text</strong>, <link>text</link>
3. Keep pluralization patterns: use "_other" suffix for plural forms
4. Maintain the same tone and formality level
5. Consider cultural context and local conventions
6. For technical terms, use commonly accepted translations in ${localeName}

English phrases to translate:

${Object.entries(sourceTranslations)
  .map(([key, value]) => `"${key}": "${value}"`)
  .join('\n')}

Return the translations in the same JSON format:
{
  "English phrase 1": "${localeName} translation 1",
  "English phrase 2": "${localeName} translation 2",
  ...
}
`
}

// Generate translation prompts for missing keys
export function generateTranslationTasks() {
  const { translations } = require('../packages/shared/i18n/translations')
  const englishKeys = Object.keys(translations.en)
  
  const tasks: Array<{ locale: Locale; missingKeys: string[] }> = []
  
  for (const locale of Object.keys(translations) as Locale[]) {
    if (locale === 'en') continue
    
    const localeKeys = Object.keys(translations[locale] || {})
    const missingKeys = englishKeys.filter(key => !localeKeys.includes(key))
    
    if (missingKeys.length > 0) {
      tasks.push({ locale, missingKeys })
    }
  }
  
  return tasks
}
```

### 3. Translation Validation

```typescript
// scripts/validate-translations.ts
import { translations } from '../packages/shared/i18n/translations'
import type { Locale } from '../packages/shared/i18n/types'

interface ValidationError {
  locale: Locale
  key: string
  error: string
}

export function validateTranslations(): ValidationError[] {
  const errors: ValidationError[] = []
  const englishKeys = Object.keys(translations.en)
  
  for (const [locale, localeTranslations] of Object.entries(translations) as [Locale, Record<string, string>][]) {
    if (locale === 'en') continue
    
    for (const key of englishKeys) {
      const englishText = translations.en[key]
      const translatedText = localeTranslations[key]
      
      if (!translatedText) {
        errors.push({
          locale,
          key,
          error: 'Missing translation'
        })
        continue
      }
      
      // Check interpolation variables
      const englishVars = englishText.match(/{{(\w+)}}/g) || []
      const translatedVars = translatedText.match(/{{(\w+)}}/g) || []
      
      if (englishVars.length !== translatedVars.length) {
        errors.push({
          locale,
          key,
          error: `Interpolation variable mismatch. English: ${englishVars.join(', ')}, ${locale}: ${translatedVars.join(', ')}`
        })
      }
      
      // Check HTML tags
      const englishTags = englishText.match(/<\/?(\w+)>/g) || []
      const translatedTags = translatedText.match(/<\/?(\w+)>/g) || []
      
      if (englishTags.length !== translatedTags.length) {
        errors.push({
          locale,
          key,
          error: `HTML tag mismatch. English: ${englishTags.join(', ')}, ${locale}: ${translatedTags.join(', ')}`
        })
      }
    }
  }
  
  return errors
}

// Generate validation report
if (require.main === module) {
  const errors = validateTranslations()
  
  if (errors.length === 0) {
    console.log('✅ All translations are valid!')
  } else {
    console.log(`❌ Found ${errors.length} validation errors:`)
    for (const error of errors) {
      console.log(`  ${error.locale}: ${error.key} - ${error.error}`)
    }
  }
}
```

## Adding New Languages

### 1. Add Locale to Types

```typescript
// packages/shared/i18n/types.ts
export const locales = ['en', 'es', 'fr', 'de', 'it'] as const // Add 'it'
export type Locale = typeof locales[number]
```

### 2. Add Translation Object

```typescript
// packages/shared/i18n/translations.ts
export const translations = {
  // ... existing translations
  
  // Italian translations (new)
  it: {
    'Welcome back! Please sign in to your account': 'Bentornato! Accedi al tuo account',
    'Invalid email or password': 'Email o password non validi',
    // ... add all required translations
  },
} satisfies Record<Locale, Record<string, string>>
```

### 3. Update Language Switcher

```typescript
// Update language options in React components
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' }, // Add Italian
] as const
```

## Translation Workflow Best Practices

### Development Workflow
1. **Write code with English text as keys**
2. **Extract translations** using the extraction script
3. **Generate AI prompts** for missing translations
4. **Validate translations** before deployment
5. **Test in different locales** during development

### AI Translation Tips
- **Provide context**: Include surrounding code or UI context
- **Batch similar translations**: Group related phrases together
- **Review AI output**: Always validate AI-generated translations
- **Use native speakers**: Have native speakers review important translations
- **Iterate on feedback**: Refine translations based on user feedback

### Maintenance
- **Regular audits**: Check for missing or outdated translations
- **Version control**: Track translation changes in git
- **Documentation**: Document translation conventions and style guides
- **Automation**: Set up CI checks for translation validation

This approach provides a scalable, maintainable translation system that leverages AI while maintaining quality and consistency.