import { z } from 'zod'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
export type TransactionFlowKind = 'expense' | 'income' | 'transfer'

// Today's guard carried over verbatim (design D6): parseable AND at least
// 1 minor unit.
const amountField = z
  .string()
  .min(1, 'Введите сумму')
  .refine((value) => {
    const parsedAmount = parseMajorUnitsToMinor(value)
    return parsedAmount !== null && parsedAmount >= 1
  }, 'Некорректная сумма')

export const createTransactionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('expense'),
    amount: amountField,
    accountId: z.string().min(1, 'Выберите счёт'),
    categoryId: z.string().min(1, 'Выберите категорию'),
  }),
  z.object({
    kind: z.literal('income'),
    amount: amountField,
    accountId: z.string().min(1, 'Выберите счёт'),
    categoryId: z.string().min(1, 'Выберите категорию'),
  }),
  z.object({
    kind: z.literal('transfer'),
    amount: amountField,
    fromAccountId: z.string().min(1, 'Выберите счёт списания'),
    toAccountId: z.string().min(1, 'Выберите счёт зачисления'),
  }),
])

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>

/** One complete variant per flow kind; a mode change re-initializes with it. */
export const createTransactionDefaultValues = {
  expense: { kind: 'expense', amount: '', accountId: '', categoryId: '' },
  income: { kind: 'income', amount: '', accountId: '', categoryId: '' },
  transfer: { kind: 'transfer', amount: '', fromAccountId: '', toAccountId: '' },
} satisfies Record<TransactionFlowKind, CreateTransactionFormValues>
