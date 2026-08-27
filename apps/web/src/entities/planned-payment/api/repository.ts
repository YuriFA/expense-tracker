import { inject, type InjectionKey } from 'vue'
import type {
  CreatePlannedPaymentPayload,
  PlannedPaymentQuery,
  UpdatePlannedPaymentPayload,
} from '@expense-tracker/api'
// The confirm composite (create transaction + advance the plan in one local
// transaction) is client-only, so the local repository type - not the shared
// contract - is the honest seam for the DI key.
import type {
  ConfirmPlannedPaymentInput,
  LocalPlannedPaymentRepository,
} from '@expense-tracker/local-data'

export type {
  CreatePlannedPaymentPayload,
  PlannedPaymentQuery,
  UpdatePlannedPaymentPayload,
} from '@expense-tracker/api'
export type { ConfirmPlannedPaymentInput } from '@expense-tracker/local-data'

export const PLANNED_PAYMENT_REPOSITORY_KEY: InjectionKey<LocalPlannedPaymentRepository> =
  Symbol('planned-payment-repository')

export function usePlannedPaymentRepository(): LocalPlannedPaymentRepository {
  const repo = inject(PLANNED_PAYMENT_REPOSITORY_KEY)
  if (!repo) {
    throw new Error('PlannedPaymentRepository not provided. Call provideRepositories(app) in main.ts.')
  }
  return repo
}
