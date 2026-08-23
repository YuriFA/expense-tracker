import { z } from 'zod'
import type { Transaction } from '@expense-tracker/api'
import { minorToInputValue } from '@/shared/lib/money/display'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.

// Same amount contract as the create form: a keypad-format string that must
// parse to at least 1 minor unit.
const amountField = z
  .string()
  .min(1, 'Введите сумму')
  .refine((value) => {
    const parsedAmount = parseMajorUnitsToMinor(value)
    return parsedAmount !== null && parsedAmount >= 1
  }, 'Некорректная сумма')

const noteField = z.string()
const occurredAtField = z.string().min(1)

// Mirrors the create schema but discriminates on the record's immutable
// `type`: the edit form never switches kinds, so there is no transient
// `kind` discriminator - the union branch is fixed for the sheet's lifetime.
export const editTransactionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('expense'),
    amount: amountField,
    description: noteField,
    occurredAt: occurredAtField,
    accountId: z.string().min(1, 'Выберите счёт'),
    categoryId: z.string().min(1, 'Выберите категорию'),
  }),
  z.object({
    type: z.literal('income'),
    amount: amountField,
    description: noteField,
    occurredAt: occurredAtField,
    accountId: z.string().min(1, 'Выберите счёт'),
    categoryId: z.string().min(1, 'Выберите категорию'),
  }),
  z.object({
    type: z.literal('transfer'),
    amount: amountField,
    description: noteField,
    occurredAt: occurredAtField,
    fromAccountId: z.string().min(1, 'Выберите счёт списания'),
    toAccountId: z.string().min(1, 'Выберите счёт зачисления'),
  }),
])

export type EditTransactionFormValues = z.infer<typeof editTransactionSchema>

/**
 * Prefill from the record: the amount becomes a keypad-format major string
 * (`minorToInputValue`), so saving unparsed round-trips the minor units
 * exactly. The record's `version` stays outside the form values - it is sent
 * with the payload, never edited.
 */
export function editTransactionDefaultValues(transaction: Transaction): EditTransactionFormValues {
  const base = {
    amount: minorToInputValue(transaction.amount),
    description: transaction.description ?? '',
    occurredAt: transaction.occurredAt,
  }
  if (transaction.type === 'transfer') {
    return {
      type: 'transfer',
      ...base,
      fromAccountId: transaction.fromAccountId,
      toAccountId: transaction.toAccountId,
    }
  }
  return {
    type: transaction.type,
    ...base,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
  }
}
