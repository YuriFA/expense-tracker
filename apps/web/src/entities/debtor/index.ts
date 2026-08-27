export type { Debtor } from './model/types'
export { DEBTOR_REPOSITORY_KEY, useDebtorRepository } from './api/repository'
export {
  useDebtors,
  useCreateDebtor,
  useUpdateDebtor,
  useDeleteDebtor,
} from './model/use-debtors'
