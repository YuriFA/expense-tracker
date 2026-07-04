import type { ErrorContext } from './types'

export function logErrorToBackend(error: unknown, context?: ErrorContext): void {
  const tag = context?.action ? `[${context.action}]` : '[error]'
  if (import.meta.env.VITE_APP_ENV !== 'production') {
    console.error(tag, error)
  }
  // TODO: integrate Sentry / other service when backend exists. Keep structured for now.
}
