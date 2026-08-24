import type {
  PlannedPayment,
  PlannedPaymentType,
} from '../domain/planned_payment'
import type { Repository } from '../repository'

export type CreatePlannedPaymentPayload = Pick<
  PlannedPayment,
  | 'type'
  | 'amount'
  | 'accountId'
  | 'categoryId'
  | 'nextDue'
  | 'regularity'
  | 'confirmMode'
  | 'reminder'
> & {
  /** Optional name (not unique); absent means an empty string on the server. */
  name?: string
  /** Optional note; absent means an empty string on the server. */
  note?: string
} & Partial<Pick<PlannedPayment, 'id'>>
/**
 * PATCH carries the CAS `version`; `name` / `note` absent = keep, empty string
 * = clear (never null); updating `nextDue` resets the server-side anchor. The
 * plan's `type` is immutable and therefore not updatable.
 */
export type UpdatePlannedPaymentPayload = Partial<
  Pick<
    PlannedPayment,
    | 'amount'
    | 'name'
    | 'note'
    | 'accountId'
    | 'categoryId'
    | 'nextDue'
    | 'regularity'
    | 'confirmMode'
    | 'reminder'
  >
> & {
  /** Optimistic-concurrency CAS token: the version the caller previously read. */
  version: number
}

export interface PlannedPaymentQuery {
  /** Restrict the listing to one plan type. */
  type?: PlannedPaymentType
}

export type PlannedPaymentRepository = Repository<
  PlannedPayment,
  CreatePlannedPaymentPayload,
  UpdatePlannedPaymentPayload
> & {
  query(options: PlannedPaymentQuery): Promise<PlannedPayment[]>
}
