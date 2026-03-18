# AI-Assisted Translation Workflows — Automated Translation with Context

Comprehensive workflows for AI-assisted translation using English-as-keys pattern for maximum context and efficiency.

## AI Translation Strategy

### 1. Context-Rich Translation Prompts

The English-as-keys approach provides perfect context for AI translation:

```typescript
// Instead of cryptic keys that need explanation:
t('auth.login.error.invalid') // AI needs context: what does this mean?

// English-as-keys provides immediate context:
t('Invalid email or password. Please check your credentials and try again.')
// AI knows exactly what this is for and can translate appropriately
```

### 2. AI Translation Prompt Templates

```typescript
// scripts/ai-prompts.ts
export interface TranslationPromptConfig {
  targetLocale: string
  localeName: string
  culturalContext?: string
  formalityLevel: 'formal' | 'casual' | 'mixed'
  domain: 'general' | 'technical' | 'marketing' | 'legal'
}

export function generateTranslationPrompt(
  sourceTexts: string[],
  config: TranslationPromptConfig
): string {
  const { targetLocale, localeName, culturalContext, formalityLevel, domain } = config
  
  return `
You are a professional translator specializing in ${domain} content. Translate the following English phrases to ${localeName} (${targetLocale}).

CRITICAL REQUIREMENTS:
1. **Preserve all interpolation variables exactly**: {{variable}}, {{count}}, {{name}}, etc.
2. **Maintain HTML tags precisely**: <strong>text</strong>, <link>text</link>, <br>, etc.
3. **Keep pluralization patterns**: Use "_other" suffix for plural forms when provided
4. **Match formality level**: ${formalityLevel === 'formal' ? 'Use formal language appropriate for business/professional contexts' : formalityLevel === 'casual' ? 'Use casual, friendly language' : 'Match the formality level of each individual phrase'}
5. **Consider cultural context**: ${culturalContext || `Adapt to ${localeName} cultural norms and expectations`}
6. **Technical accuracy**: For technical terms, use established ${localeName} translations in the ${domain} domain
7. **Consistency**: Use consistent terminology throughout all translations

EXAMPLES OF PROPER FORMATTING:
- English: "Hello {{name}}, you have {{count}} messages"
- ${localeName}: [Keep {{name}} and {{count}} exactly as shown]

- English: "Click <strong>Save</strong> to continue"
- ${localeName}: [Keep <strong> and </strong> tags exactly as shown]

- English: "You have {{count}} item" + "You have {{count}} item_other"
- ${localeName}: [Provide both singular and plural forms with _other suffix]

SOURCE PHRASES TO TRANSLATE:

${sourceTexts.map((text, index) => `${index + 1}. "${text}"`).join('\n')}

RESPOND WITH ONLY THE TRANSLATIONS IN THIS EXACT JSON FORMAT:
{
  "${sourceTexts[0]}": "[${localeName} translation 1]",
  "${sourceTexts[1]}": "[${localeName} translation 2]",
  ...
}
`
}
```

### 3. Automated Translation Pipeline

```typescript
// scripts/translate-pipeline.ts
import { readFileSync, writeFileSync } from 'fs'
import { translations } from '../packages/shared/i18n/translations'
import type { Locale } from '../packages/shared/i18n/types'

interface TranslationTask {
  locale: Locale
  missingKeys: string[]
  existingTranslations: Record<string, string>
}

export class AITranslationPipeline {
  private readonly batchSize = 20 // Translate in batches to avoid token limits
  
  async translateMissingKeys(locale: Locale): Promise<Record<string, string>> {
    const task = this.identifyMissingTranslations(locale)
    
    if (task.missingKeys.length === 0) {
      console.log(`✅ ${locale}: All translations complete`)
      return {}
    }
    
    console.log(`🔄 ${locale}: Translating ${task.missingKeys.length} missing keys`)
    
    const newTranslations: Record<string, string> = {}
    
    // Process in batches
    for (let i = 0; i < task.missingKeys.length; i += this.batchSize) {
      const batch = task.missingKeys.slice(i, i + this.batchSize)
      const batchTranslations = await this.translateBatch(batch, locale)
      Object.assign(newTranslations, batchTranslations)
      
      // Add delay between batches to respect API limits
      if (i + this.batchSize < task.missingKeys.length) {
        await this.delay(1000)
      }
    }
    
    return newTranslations
  }
  
  private identifyMissingTranslations(locale: Locale): TranslationTask {
    const englishKeys = Object.keys(translations.en)
    const existingTranslations = translations[locale] || {}
    const missingKeys = englishKeys.filter(key => !existingTranslations[key])
    
    return {
      locale,
      missingKeys,
      existingTranslations
    }
  }
  
  private async translateBatch(
    keys: string[],
    locale: Locale
  ): Promise<Record<string, string>> {
    const config = this.getLocaleConfig(locale)
    const prompt = generateTranslationPrompt(keys, config)
    
    try {
      // Replace with your AI service (OpenAI, Claude, etc.)
      const response = await this.callAIService(prompt)
      const translations = this.parseTranslationResponse(response)
      
      // Validate translations
      this.validateTranslations(keys, translations, locale)
      
      return translations
    } catch (error) {
      console.error(`❌ Failed to translate batch for ${locale}:`, error)
      return {}
    }
  }
  
  private getLocaleConfig(locale: Locale): TranslationPromptConfig {
    const configs: Record<Locale, TranslationPromptConfig> = {
      es: {
        targetLocale: 'es',
        localeName: 'Spanish',
        culturalContext: 'Latin American Spanish preferred, but avoid regional slang',
        formalityLevel: 'mixed',
        domain: 'technical'
      },
      fr: {
        targetLocale: 'fr',
        localeName: 'French',
        culturalContext: 'European French, professional tone',
        formalityLevel: 'formal',
        domain: 'technical'
      },
      de: {
        targetLocale: 'de',
        localeName: 'German',
        culturalContext: 'Standard German, clear and precise',
        formalityLevel: 'formal',
        domain: 'technical'
      },
      en: {
        targetLocale: 'en',
        localeName: 'English',
        formalityLevel: 'mixed',
        domain: 'technical'
      }
    }
    
    return configs[locale]
  }
  
  private validateTranslations(
    sourceKeys: string[],
    translations: Record<string, string>,
    locale: Locale
  ): void {
    for (const key of sourceKeys) {
      const translation = translations[key]
      
      if (!translation) {
        console.warn(`⚠️  ${locale}: Missing translation for "${key}"`)
        continue
      }
      
      // Validate interpolation variables
      const sourceVars = key.match(/{{(\w+)}}/g) || []
      const translationVars = translation.match(/{{(\w+)}}/g) || []
      
      if (sourceVars.length !== translationVars.length) {
        console.error(`❌ ${locale}: Interpolation mismatch for "${key}"`)
        console.error(`   Source: ${sourceVars.join(', ')}`)
        console.error(`   Translation: ${translationVars.join(', ')}`)
      }
      
      // Validate HTML tags
      const sourceTags = key.match(/<\/?(\w+)>/g) || []
      const translationTags = translation.match(/<\/?(\w+)>/g) || []
      
      if (sourceTags.length !== translationTags.length) {
        console.error(`❌ ${locale}: HTML tag mismatch for "${key}"`)
        console.error(`   Source: ${sourceTags.join(', ')}`)
        console.error(`   Translation: ${translationTags.join(', ')}`)
      }
    }
  }
  
  private parseTranslationResponse(response: string): Record<string, string> {
    try {
      // Extract JSON from response (handle cases where AI adds explanation)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Failed to parse AI response:', response)
      throw error
    }
  }
  
  private async callAIService(prompt: string): Promise<string> {
    // Example with OpenAI (replace with your preferred service)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Respond only with the requested JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent translations
      })
    })
    
    const data = await response.json()
    return data.choices[0].message.content
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 4. Translation Quality Assurance

```typescript
// scripts/translation-qa.ts
export class TranslationQA {
  async reviewTranslations(locale: Locale): Promise<QAReport> {
    const report: QAReport = {
      locale,
      totalKeys: 0,
      issues: [],
      suggestions: []
    }
    
    const englishTranslations = translations.en
    const localeTranslations = translations[locale] || {}
    
    report.totalKeys = Object.keys(englishTranslations).length
    
    for (const [key, englishText] of Object.entries(englishTranslations)) {
      const translation = localeTranslations[key]
      
      if (!translation) {
        report.issues.push({
          type: 'missing',
          key,
          description: 'Translation missing'
        })
        continue
      }
      
      // Check for common issues
      await this.checkTranslationQuality(key, englishText, translation, report)
    }
    
    return report
  }
  
  private async checkTranslationQuality(
    key: string,
    english: string,
    translation: string,
    report: QAReport
  ): Promise<void> {
    // Length variance check (translations shouldn't be dramatically different in length)
    const lengthRatio = translation.length / english.length
    if (lengthRatio > 2.5 || lengthRatio < 0.4) {
      report.issues.push({
        type: 'length_variance',
        key,
        description: `Translation length varies significantly from source (${lengthRatio.toFixed(2)}x)`
      })
    }
    
    // Interpolation variable check
    const englishVars = english.match(/{{(\w+)}}/g) || []
    const translationVars = translation.match(/{{(\w+)}}/g) || []
    
    const missingVars = englishVars.filter(v => !translationVars.includes(v))
    const extraVars = translationVars.filter(v => !englishVars.includes(v))
    
    if (missingVars.length > 0) {
      report.issues.push({
        type: 'missing_variables',
        key,
        description: `Missing variables: ${missingVars.join(', ')}`
      })
    }
    
    if (extraVars.length > 0) {
      report.issues.push({
        type: 'extra_variables',
        key,
        description: `Extra variables: ${extraVars.join(', ')}`
      })
    }
    
    // HTML tag check
    const englishTags = english.match(/<\/?(\w+)>/g) || []
    const translationTags = translation.match(/<\/?(\w+)>/g) || []
    
    if (englishTags.length !== translationTags.length) {
      report.issues.push({
        type: 'html_mismatch',
        key,
        description: `HTML tag count mismatch: ${englishTags.length} vs ${translationTags.length}`
      })
    }
    
    // Consistency check (same English text should have same translation)
    // This helps catch inconsistencies in AI translations
    const duplicateKeys = Object.entries(translations.en)
      .filter(([otherKey, otherText]) => otherKey !== key && otherText === english)
      .map(([otherKey]) => otherKey)
    
    if (duplicateKeys.length > 0) {
      const otherTranslations = duplicateKeys
        .map(k => translations[report.locale][k])
        .filter(t => t && t !== translation)
      
      if (otherTranslations.length > 0) {
        report.suggestions.push({
          type: 'consistency',
          key,
          description: `Same English text has different translations: "${translation}" vs "${otherTranslations[0]}"`
        })
      }
    }
  }
}

interface QAReport {
  locale: Locale
  totalKeys: number
  issues: QAIssue[]
  suggestions: QASuggestion[]
}

interface QAIssue {
  type: 'missing' | 'length_variance' | 'missing_variables' | 'extra_variables' | 'html_mismatch'
  key: string
  description: string
}

interface QASuggestion {
  type: 'consistency' | 'improvement'
  key: string
  description: string
}
```

### 5. Interactive Translation Review

```typescript
// scripts/translation-review.ts
import readline from 'readline'

export class InteractiveTranslationReview {
  private rl: readline.Interface
  
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }
  
  async reviewTranslations(locale: Locale): Promise<void> {
    console.log(`\n🔍 Reviewing ${locale} translations...\n`)
    
    const englishKeys = Object.keys(translations.en)
    const localeTranslations = translations[locale] || {}
    
    for (const key of englishKeys) {
      const english = translations.en[key]
      const translation = localeTranslations[key]
      
      if (!translation) {
        console.log(`❌ Missing translation:`)
        console.log(`   English: "${english}"`)
        
        const newTranslation = await this.promptForTranslation()
        if (newTranslation.trim()) {
          localeTranslations[key] = newTranslation.trim()
          console.log(`✅ Added translation\n`)
        } else {
          console.log(`⏭️  Skipped\n`)
        }
        continue
      }
      
      // Review existing translations
      console.log(`📝 Review translation:`)
      console.log(`   English: "${english}"`)
      console.log(`   ${locale}: "${translation}"`)
      
      const action = await this.promptForAction()
      
      switch (action) {
        case 'e':
          const editedTranslation = await this.promptForTranslation(translation)
          if (editedTranslation.trim()) {
            localeTranslations[key] = editedTranslation.trim()
            console.log(`✅ Updated translation\n`)
          }
          break
        case 's':
          console.log(`⏭️  Skipped\n`)
          break
        case 'q':
          console.log(`👋 Review session ended\n`)
          this.rl.close()
          return
        default:
          console.log(`✅ Approved\n`)
      }
    }
    
    // Save updated translations
    this.saveTranslations(locale, localeTranslations)
    this.rl.close()
  }
  
  private promptForTranslation(current?: string): Promise<string> {
    const prompt = current 
      ? `Edit translation (current: "${current}"): `
      : `Enter translation: `
    
    return new Promise(resolve => {
      this.rl.question(prompt, resolve)
    })
  }
  
  private promptForAction(): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(
        `Action: (a)pprove, (e)dit, (s)kip, (q)uit [a]: `,
        (answer) => resolve(answer.toLowerCase() || 'a')
      )
    })
  }
  
  private saveTranslations(locale: Locale, translations: Record<string, string>): void {
    // Update the translations file
    const filePath = '../packages/shared/i18n/translations.ts'
    // Implementation to update the file...
    console.log(`💾 Saved ${Object.keys(translations).length} translations for ${locale}`)
  }
}
```

### 6. CLI Tool for Translation Management

```typescript
// scripts/i18n-cli.ts
#!/usr/bin/env node

import { Command } from 'commander'
import { AITranslationPipeline } from './translate-pipeline'
import { TranslationQA } from './translation-qa'
import { InteractiveTranslationReview } from './translation-review'

const program = new Command()

program
  .name('i18n-cli')
  .description('AI-assisted translation management tool')
  .version('1.0.0')

program
  .command('translate')
  .description('Translate missing keys using AI')
  .argument('<locale>', 'Target locale (es, fr, de, etc.)')
  .option('--review', 'Review translations interactively after AI translation')
  .action(async (locale, options) => {
    const pipeline = new AITranslationPipeline()
    
    console.log(`🤖 Starting AI translation for ${locale}...`)
    const newTranslations = await pipeline.translateMissingKeys(locale)
    
    console.log(`✅ Translated ${Object.keys(newTranslations).length} keys`)
    
    if (options.review) {
      const reviewer = new InteractiveTranslationReview()
      await reviewer.reviewTranslations(locale)
    }
  })

program
  .command('review')
  .description('Interactively review translations')
  .argument('<locale>', 'Target locale to review')
  .action(async (locale) => {
    const reviewer = new InteractiveTranslationReview()
    await reviewer.reviewTranslations(locale)
  })

program
  .command('qa')
  .description('Run quality assurance checks on translations')
  .argument('<locale>', 'Target locale to check')
  .action(async (locale) => {
    const qa = new TranslationQA()
    const report = await qa.reviewTranslations(locale)
    
    console.log(`\n📊 QA Report for ${locale}:`)
    console.log(`   Total keys: ${report.totalKeys}`)
    console.log(`   Issues found: ${report.issues.length}`)
    console.log(`   Suggestions: ${report.suggestions.length}`)
    
    if (report.issues.length > 0) {
      console.log(`\n❌ Issues:`)
      report.issues.forEach(issue => {
        console.log(`   ${issue.type}: ${issue.key} - ${issue.description}`)
      })
    }
    
    if (report.suggestions.length > 0) {
      console.log(`\n💡 Suggestions:`)
      report.suggestions.forEach(suggestion => {
        console.log(`   ${suggestion.type}: ${suggestion.key} - ${suggestion.description}`)
      })
    }
  })

program.parse()
```

### Usage Examples

```bash
# Translate all missing keys for Spanish using AI
npm run i18n translate es

# Translate and then review interactively
npm run i18n translate es --review

# Review existing translations
npm run i18n review fr

# Run quality assurance checks
npm run i18n qa de

# Package.json scripts
{
  "scripts": {
    "i18n": "tsx scripts/i18n-cli.ts",
    "i18n:translate-all": "npm run i18n translate es && npm run i18n translate fr && npm run i18n translate de",
    "i18n:qa-all": "npm run i18n qa es && npm run i18n qa fr && npm run i18n qa de"
  }
}
```

This AI-assisted workflow provides:

1. **Context-rich translations** using English-as-keys
2. **Automated batch processing** with validation
3. **Quality assurance** checks for consistency
4. **Interactive review** for human oversight
5. **CLI tools** for easy workflow integration
6. **Validation** of interpolation variables and HTML tags

The English-as-keys approach makes AI translation much more effective because the AI has full context about what each phrase means and how it's used.