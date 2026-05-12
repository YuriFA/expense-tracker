import z from 'zod'

export const createTransactionsFilterSchema = () => {
  return z.object({
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
  })
}

export type TransactionsFilterFormValues = z.infer<ReturnType<typeof createTransactionsFilterSchema>>
