# React i18n Integration — useTranslation & Trans Components

React integration patterns for i18next with hardcoded translations and English-as-keys.

## Core React Patterns

### 1. useTranslation Hook Usage

```typescript
// Basic usage in functional components
import { useTranslation } from 'react-i18next'

export function WelcomeComponent() {
  const { t, i18n } = useTranslation()
  
  return (
    <div>
      <h1>{t('Welcome to our application')}</h1>
      <p>{t('Please check your email for verification')}</p>
      
      {/* With interpolation */}
      <p>{t('You have {{count}} unread messages', { count: 5 })}</p>
      
      {/* Language switching */}
      <button onClick={() => i18n.changeLanguage('es')}>
        {t('Switch to Spanish')}
      </button>
    </div>
  )
}
```

### 2. Trans Component for Complex Content

```typescript
import { Trans, useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

export function TermsComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      {/* Simple text with embedded components */}
      <Trans i18nKey="By clicking continue, you agree to our <strong>Terms of Service</strong>">
        By clicking continue, you agree to our <strong>Terms of Service</strong>
      </Trans>
      
      {/* With React components */}
      <Trans 
        i18nKey="Please visit our <link>help center</link> for more information"
        components={{
          link: <Link to="/help" className="text-blue-600 hover:underline" />
        }}
      >
        Please visit our <link>help center</link> for more information
      </Trans>
      
      {/* With interpolation and components */}
      <Trans 
        i18nKey="Welcome back <strong>{{name}}</strong>, you have {{count}} notifications"
        values={{ name: 'John', count: 3 }}
        components={{
          strong: <strong className="font-semibold" />
        }}
      >
        Welcome back <strong>{{name}}</strong>, you have {{count}} notifications
      </Trans>
    </div>
  )
}
```

### 3. Language Switching Component

```typescript
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
] as const

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language)
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Globe className="h-4 w-4 mr-2" />
          {currentLanguage?.name || 'English'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
            className={i18n.language === language.code ? 'bg-accent' : ''}
          >
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 4. App Integration with Suspense

```typescript
// src/main.tsx
import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n' // Initialize i18n
import App from './App'

const root = createRoot(document.getElementById('root')!)
root.render(
  <Suspense fallback={<div>Loading translations...</div>}>
    <App />
  </Suspense>
)
```

### 5. Form Integration with react-hook-form

```typescript
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Create schema with translated error messages
function createUserSchema(t: (key: string) => string) {
  return z.object({
    email: z
      .string()
      .email(t('Please enter a valid email address')),
    password: z
      .string()
      .min(8, t('Password must be at least 8 characters long')),
  })
}

export function LoginForm() {
  const { t } = useTranslation()
  const schema = createUserSchema(t)
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">{t('Email address')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('Enter your email')}
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-600">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="password">{t('Password')}</Label>
        <Input
          id="password"
          type="password"
          placeholder={t('Enter your password')}
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-red-600">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      
      <Button type="submit" className="w-full">
        {t('Sign in to your account')}
      </Button>
    </form>
  )
}
```

### 6. TanStack Query Integration

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { toast } from '@/hooks/use-toast'

export function useCreateItem() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  
  return trpc.items.create.useMutation({
    onSuccess: (data) => {
      // Server returns localized message
      toast({
        title: t('Success'),
        description: data.message, // Already localized from server
      })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
    onError: (error) => {
      toast({
        title: t('Error'),
        description: error.message, // Already localized from server
        variant: 'destructive',
      })
    },
  })
}
```

### 7. Loading States and Error Boundaries

```typescript
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export function LoadingState() {
  const { t } = useTranslation()
  
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <p className="text-sm text-muted-foreground">
        {t('Loading your content...')}
      </p>
    </div>
  )
}

export function ErrorState({ error }: { error: Error }) {
  const { t } = useTranslation()
  
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {error.message || t('Something went wrong. Please try again.')}
      </AlertDescription>
    </Alert>
  )
}
```

## tRPC Client Configuration

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@server/router'
import i18n from './i18n'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers() {
        return {
          'x-locale': i18n.language, // Send current locale to server
        }
      },
    }),
  ],
})
```

## Best Practices

### State Management
- **Server data**: Use TanStack Query with localized server responses
- **Form data**: Use React Hook Form with translated validation
- **UI state**: Use useState for language switching
- **Global client state**: Store language preference in localStorage

### Performance
- **Suspense boundaries**: Wrap components that use translations
- **Lazy loading**: Not needed with hardcoded resources
- **Memoization**: Memo components that don't depend on language changes

### Accessibility
- **lang attribute**: Update document.documentElement.lang on language change
- **Screen readers**: Use aria-labels with translations
- **RTL support**: Add dir attribute for RTL languages

### Error Handling
- **Fallback to English**: i18next automatically falls back to English keys
- **Missing translations**: Show English text, log warnings in development
- **Network errors**: Not applicable with hardcoded resources

This integration provides a complete React i18n setup that works seamlessly with your tRPC backend and follows React best practices.