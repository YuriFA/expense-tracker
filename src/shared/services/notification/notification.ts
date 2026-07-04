import { toast } from 'vue-sonner'
import type { ErrorContext, MutationErrorOptions } from './types'
import {
  getRepositoryErrorMessage,
  getRepositoryErrorMessages,
} from '@/shared/lib/data'
import { logErrorToBackend } from './log-error'

class NotificationService {
  success(message: string) {
    toast.success(message)
  }

  warning(message: string) {
    toast.warning(message)
  }

  info(message: string) {
    toast.info(message)
  }

  error(message: string, context?: ErrorContext) {
    logErrorToBackend(message, context)
    toast.error(message)
  }

  repositoryError(error: unknown, context?: ErrorContext) {
    logErrorToBackend(error, context)
    toast.error(getRepositoryErrorMessage(error, getRepositoryErrorMessages()))
  }

  mutationError(error: unknown, options: MutationErrorOptions) {
    const { title, feature, action } = options
    logErrorToBackend(error, { feature, action })
    toast.error(title, {
      description: getRepositoryErrorMessage(error, getRepositoryErrorMessages()),
    })
  }
}

export const notification = new NotificationService()
