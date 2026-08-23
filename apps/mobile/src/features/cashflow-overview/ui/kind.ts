// Per-kind presentation for the cashflow overview components: RU wording
// and testID stems. The expense variant preserves the dashboard's original
// strings and ids byte-for-byte (existing unit tests and Maestro flows
// target them); the income variant mirrors them for the income screen.

import type { CashflowKind } from '../model/selectors'

// TODO(i18n): RU strings are hardcoded until react-i18next is wired.
interface CashflowKindCopy {
  /** Card title: «Все расходы» / «Все доходы». */
  allTitle: string
  /** Card empty state: «Расходов нет» / «Доходов нет». */
  allEmpty: string
  /** List sheet title: «Список расходов» / «Список доходов». */
  listTitle: string
  /** Empty-month text in the list sheets and the category section. */
  monthEmpty: string
  /** Empty text for non-month periods in the category sheet. */
  periodEmpty: string
  /** Period-total participle: «потрачено» / «получено». */
  totalWord: string
  /** Footer CTA: «Новый расход» / «Новый доход». */
  newTransaction: string
  /** No-categories hint under the create button. */
  categoryHint: string
  /** Category row accessibility label. */
  categoryRowA11yLabel: (name: string) => string
}

interface CashflowKindIds {
  /** Tappable all-X card. */
  allCard: string
  /** Day-grouped list sheet plus its day headers and rows. */
  listSheet: string
  listDay: string
  listRow: string
  /** Footer "new transaction" button and the sheet it opens. */
  newTransactionButton: string
  newTransactionSheet: string
  /** Category rows in the section. */
  categoryRow: string
  /** Category detail sheet and its controls. */
  categorySheet: string
  categoryPrevMonth: string
  categoryPeriod: string
  categoryNextMonth: string
  categoryTotal: string
  categorySort: string
  categoryDay: string
  categoryRowItem: string
  categoryEdit: string
  /** Footer CTA inside the category sheet. */
  categoryNewTransactionButton: string
  categoryNewTransactionSheet: string
  /** New-category button, sheet, and form-field stem on this screen. */
  newCategory: string
  newCategorySheet: string
  newCategoryForm: string
}

interface CashflowKindView {
  copy: CashflowKindCopy
  ids: CashflowKindIds
}

export const CASHFLOW_KIND_VIEWS: Record<CashflowKind, CashflowKindView> = {
  expense: {
    copy: {
      allTitle: 'Все расходы',
      allEmpty: 'Расходов нет',
      listTitle: 'Список расходов',
      monthEmpty: 'В этом месяце расходов нет',
      periodEmpty: 'За этот период расходов нет',
      totalWord: 'потрачено',
      newTransaction: 'Новый расход',
      categoryHint: 'Создайте первую категорию, чтобы записывать расходы',
      categoryRowA11yLabel: (name) => `Расходы на ${name}`,
    },
    ids: {
      allCard: 'home-all-expenses',
      listSheet: 'home-expenses-sheet',
      listDay: 'home-expense-day',
      listRow: 'home-expense-row',
      newTransactionButton: 'home-new-expense-button',
      newTransactionSheet: 'home-new-expense-sheet',
      categoryRow: 'home-category',
      categorySheet: 'category-expenses-sheet',
      categoryPrevMonth: 'category-expenses-prev-month',
      categoryPeriod: 'category-expenses-period',
      categoryNextMonth: 'category-expenses-next-month',
      categoryTotal: 'category-expenses-total',
      categorySort: 'category-expenses-sort',
      categoryDay: 'category-expense-day',
      categoryRowItem: 'category-expense-row',
      categoryEdit: 'category-expenses-edit',
      categoryNewTransactionButton: 'category-new-expense-button',
      categoryNewTransactionSheet: 'category-new-expense-sheet',
      newCategory: 'home-new-category',
      newCategorySheet: 'home-new-category-sheet',
      newCategoryForm: 'home-new-category',
    },
  },
  income: {
    copy: {
      allTitle: 'Все доходы',
      allEmpty: 'Доходов нет',
      listTitle: 'Список доходов',
      monthEmpty: 'В этом месяце доходов нет',
      periodEmpty: 'За этот период доходов нет',
      totalWord: 'получено',
      newTransaction: 'Новый доход',
      categoryHint: 'Создайте первую категорию, чтобы записывать доходы',
      categoryRowA11yLabel: (name) => `Доходы: ${name}`,
    },
    ids: {
      allCard: 'income-all-incomes',
      listSheet: 'income-incomes-sheet',
      listDay: 'income-day',
      listRow: 'income-row',
      newTransactionButton: 'income-new-income-button',
      newTransactionSheet: 'income-new-income-sheet',
      categoryRow: 'income-category',
      categorySheet: 'category-incomes-sheet',
      categoryPrevMonth: 'category-incomes-prev-month',
      categoryPeriod: 'category-incomes-period',
      categoryNextMonth: 'category-incomes-next-month',
      categoryTotal: 'category-incomes-total',
      categorySort: 'category-incomes-sort',
      categoryDay: 'category-income-day',
      categoryRowItem: 'category-income-row',
      categoryEdit: 'category-incomes-edit',
      categoryNewTransactionButton: 'category-new-income-button',
      categoryNewTransactionSheet: 'category-new-income-sheet',
      newCategory: 'income-new-category',
      newCategorySheet: 'income-new-category-sheet',
      newCategoryForm: 'income-new-category',
    },
  },
}
