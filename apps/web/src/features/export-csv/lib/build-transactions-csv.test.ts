import { describe, expect, it } from 'vitest'
import { buildTransactionsCsv, CSV_NO_ACCOUNT_LABEL } from './build-transactions-csv'
import type { Transaction } from '@/entities/transaction'
import type { Account } from '@/entities/account'
import type { Category } from '@/entities/category'

const accounts: Account[] = [
  { id: 'a1', name: 'Наличка', currency: 'RUB', openingBalance: 0, version: 1 },
  { id: 'a2', name: 'Тинькофф', currency: 'RUB', openingBalance: 0, version: 1 },
]
const categories: Category[] = [
  {
    id: 'c1',
    name: 'Продукты',
    type: 'expense',
    icon: '',
    color: '',
    archivedAt: null,
    version: 1,
  },
  { id: 'c2', name: 'Зарплата', type: 'income', icon: '', color: '', archivedAt: null, version: 1 },
]

const tx = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    type: 'expense',
    amount: 123_456,
    description: '',
    occurredAt: '2026-08-20T09:30:00.000Z',
    accountId: 'a1',
    categoryId: 'c1',
    version: 1,
    ...overrides,
  }) as Transaction

describe('buildTransactionsCsv', () => {
  it('renders the header and one row per transaction with RU headers and decimal comma', () => {
    const csv = buildTransactionsCsv([tx()], { accounts, categories })
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('дата;тип;категория;счёт;сумма;примечание')
    expect(lines[1]).toBe('20.08.2026;расход;Продукты;Наличка;1234,56;')
  })

  it('labels account-less cashflow rows with the «Без счета» marker', () => {
    const csv = buildTransactionsCsv([tx({ accountId: null })], { accounts, categories })
    expect(csv.split('\r\n')[1]).toBe(`20.08.2026;расход;Продукты;${CSV_NO_ACCOUNT_LABEL};1234,56;`)
  })

  it('renders transfers as from → to with no category, unsigned amount', () => {
    const csv = buildTransactionsCsv(
      [
        tx({
          type: 'transfer',
          amount: 500,
          accountId: null,
          categoryId: undefined,
          fromAccountId: 'a1',
          toAccountId: 'a2',
        } as Partial<Transaction>),
      ],
      { accounts, categories },
    )
    expect(csv.split('\r\n')[1]).toBe('20.08.2026;перевод;;Наличка → Тинькофф;5,00;')
  })

  it('keeps the adjustment sign and ignores unknown-ref label fallbacks', () => {
    const csv = buildTransactionsCsv(
      [
        tx({
          type: 'adjustment',
          amount: -750,
          accountId: 'a1',
          categoryId: undefined,
        } as Partial<Transaction>),
      ],
      { accounts, categories },
    )
    expect(csv.split('\r\n')[1]).toBe('20.08.2026;корректировка;;Наличка;-7,50;')
  })

  it('quotes fields with delimiters, quotes, or line breaks', () => {
    const csv = buildTransactionsCsv([tx({ description: 'хлеб;молоко "5",\nсписок' })], {
      accounts: [{ ...accounts[0]!, name: 'Счёт; основной' }],
      categories,
    })
    expect(csv.split('\r\n')[1]).toContain('"хлеб;молоко ""5"",')
    expect(csv).toContain('"Счёт; основной"')
  })

  it('emits unsigned amounts for the classic types regardless of stored sign', () => {
    const csv = buildTransactionsCsv([tx({ type: 'income', amount: 70_000, categoryId: 'c2' })], {
      accounts,
      categories,
    })
    expect(csv.split('\r\n')[1]).toBe('20.08.2026;доход;Зарплата;Наличка;700,00;')
  })
})
