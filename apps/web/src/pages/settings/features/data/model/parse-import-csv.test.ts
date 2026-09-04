import { describe, expect, it } from 'vitest'
import { importRowId, parseCsvGrid, parseImportCsv } from './parse-import-csv'
import type { Account } from '@/entities/account'
import { buildTransactionsCsv, CSV_NO_ACCOUNT_LABEL } from '@/features/export-csv'
import type { Transaction } from '@/entities/transaction'
import type { Category } from '@/entities/category'

const accounts: Account[] = [
  { id: 'a1', name: 'Наличка', currency: 'RUB', openingBalance: 0, version: 1 },
]

describe('parseCsvGrid', () => {
  it('splits on ; with quotes, doubled quotes, and CRLF rows', () => {
    const grid = parseCsvGrid('a;"b;c";"d""e"\r\nx;;y\n')
    expect(grid).toEqual([
      ['a', 'b;c', 'd"e'],
      ['x', '', 'y'],
    ])
  })

  it('strips the BOM', () => {
    expect(parseCsvGrid('﻿дата;тих')[0]).toEqual(['дата', 'тих'])
  })
})

describe('parseImportCsv', () => {
  it('parses a valid RU template row with decimal comma into minor units', async () => {
    const result = await parseImportCsv(
      'дата;тип;категория;сумма;примечание;счёт\n3.09.26;расход;Транспорт;800,50;;',
      { accounts },
    )
    expect(result.headerError).toBeNull()
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]!
    expect(row).toMatchObject({
      status: 'valid',
      direction: 'expense',
      occurredAt: '2026-09-03T12:00:00.000Z',
      categoryName: 'Транспорт',
      amountMinor: 80_050,
      accountId: null,
    })
  })

  it('maps columns by header name regardless of order and language', async () => {
    const result = await parseImportCsv(
      'amount;date;type;account;note;category\n1.5;2026-09-03;income;Наличка;зп;Работа',
      { accounts },
    )
    expect(result.rows[0]).toMatchObject({
      status: 'valid',
      direction: 'income',
      amountMinor: 150,
      accountId: 'a1',
      note: 'зп',
      categoryName: 'Работа',
    })
  })

  it('accepts the «Без счета» marker and English type words', async () => {
    const result = await parseImportCsv(
      `дата;тип;категория;сумма;счёт\n01.09.2026;expense;Еда;100;${CSV_NO_ACCOUNT_LABEL}`,
      { accounts },
    )
    expect(result.rows[0]).toMatchObject({ status: 'valid', accountId: null })
  })

  it('reports per-row error codes and keeps parsing the rest', async () => {
    const result = await parseImportCsv(
      [
        'дата;тип;категория;сумма;счёт',
        '01.09.2026;бартер;Еда;100;',
        '32.13.2026;расход;Еда;100;',
        '01.09.2026;расход;Еда;0;',
        '01.09.2026;расход;;100;',
        '01.09.2026;расход;Еда;100;Несуществующий счёт',
        '01.09.2026;расход;Еда;100;',
      ].join('\n'),
      { accounts },
    )
    expect(result.rows.map((row) => (row.status === 'invalid' ? row.code : 'valid'))).toEqual([
      'bad-type',
      'bad-date',
      'bad-amount',
      'empty-category',
      'unknown-account',
      'valid',
    ])
  })

  it('rejects the same category name under both directions', async () => {
    const result = await parseImportCsv(
      [
        'дата;тип;категория;сумма',
        '01.09.2026;расход;Хобби;100',
        '02.09.2026;доход;Хобби;100',
      ].join('\n'),
      { accounts },
    )
    expect(result.rows[1]).toMatchObject({ status: 'invalid', code: 'category-conflict' })
  })

  it('fails the whole file when required headers are missing', async () => {
    const result = await parseImportCsv('категория;сумма\nЕда;100', { accounts })
    expect(result.headerError).toBe('missing-columns')
  })

  it('round-trips an export back into identical rows', async () => {
    const exportAccounts: Account[] = accounts.map((a) => ({ ...a }))
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
      {
        id: 'c2',
        name: 'Зарплата',
        type: 'income',
        icon: '',
        color: '',
        archivedAt: null,
        version: 1,
      },
    ]
    const transactions: Transaction[] = [
      {
        id: 't1',
        type: 'expense',
        amount: 12_345,
        description: 'покупка',
        occurredAt: '2026-08-20T09:30:00.000Z',
        accountId: 'a1',
        categoryId: 'c1',
        version: 1,
      },
      {
        id: 't2',
        type: 'income',
        amount: 700_000,
        description: '',
        occurredAt: '2026-08-21T18:00:00.000Z',
        accountId: null,
        categoryId: 'c2',
        version: 1,
      } as Transaction,
    ]
    const csv = buildTransactionsCsv(transactions, { accounts: exportAccounts, categories })
    const parsed = await parseImportCsv(csv, { accounts })
    expect(parsed.headerError).toBeNull()
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0]).toMatchObject({
      status: 'valid',
      direction: 'expense',
      amountMinor: 12_345,
      accountId: 'a1',
      categoryName: 'Продукты',
      note: 'покупка',
      occurredAt: '2026-08-20T12:00:00.000Z',
    })
    expect(parsed.rows[1]).toMatchObject({ status: 'valid', direction: 'income', accountId: null })
  })
})

describe('importRowId', () => {
  it('is deterministic, differs per content, and is UUID-shaped', async () => {
    const a = await importRowId('2026-09-03|expense|еда|100|')
    const aAgain = await importRowId('2026-09-03|expense|еда|100|')
    const b = await importRowId('2026-09-03|expense|еда|101|')
    expect(a).toBe(aAgain)
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
