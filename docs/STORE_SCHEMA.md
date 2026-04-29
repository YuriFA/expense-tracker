# Store Schema

Ниже схема `Pinia` stores для expense tracker без лишнего усложнения.

## General Principles

- один store на одну доменную область
- store хранит state и доменные actions
- сложные вычисления держи в getters или рядом в `utils`
- не тащи в store чисто UI-состояние одной локальной формы

## `useTransactionsStore`

Главный store проекта.

### State

- `items: Transaction[]`
- `isLoaded: boolean`

### Getters

- `sortedTransactions`
- `incomeTransactions`
- `expenseTransactions`
- `totalIncome`
- `totalExpense`
- `balance`
- `recentTransactions`

### Actions

- `load()`
- `addTransaction(payload)`
- `updateTransaction(id, payload)`
- `removeTransaction(id)`
- `replaceAll(items)`

### Notes

- сортировку лучше держать централизованно
- после каждой мутации можно синхронизировать данные в `localStorage`
- если фильтры глобально не нужны, не храни их здесь

## `useCategoriesStore`

Store для категорий доходов и расходов.

### State

- `items: Category[]`

### Getters

- `incomeCategories`
- `expenseCategories`
- `findById`

### Actions

- `loadDefaults()`
- `addCategory(payload)`
- `updateCategory(id, payload)`
- `removeCategory(id)`
- `replaceAll(items)`

### Notes

- дефолтные категории можно подмешивать при первом запуске
- удаление категории требует правила: запретить удаление или отвязывать связанные транзакции

## `useBudgetsStore`

Store для лимитов по категориям.

### State

- `items: Budget[]`

### Getters

- `monthlyBudgets`
- `findByCategoryId`

### Actions

- `setBudget(categoryId, limit)`
- `removeBudget(id)`
- `replaceAll(items)`

### Notes

- на MVP достаточно только месячного лимита
- не усложняй сразу недельными и кастомными периодами

## `useSettingsStore`

Store пользовательских настроек.

### State

- `locale: 'ru' | 'en'`
- `currency: string`
- `theme: 'light' | 'dark'`

### Getters

- обычно не нужны, state и так плоский

### Actions

- `setLocale(locale)`
- `setCurrency(currency)`
- `setTheme(theme)`
- `hydrate(payload)`

### Notes

- этот store удобно синхронизировать с `i18n` и DOM theme class
- настройки лучше загружать раньше остальных экранов

## Optional `useUiStore`

Нужен только если UI-состояние стало повторяться в нескольких местах.

### State

- `isTransactionModalOpen`
- `activeTransactionId`
- `sidebarOpen`

### Actions

- `openTransactionModal(id?)`
- `closeTransactionModal()`
- `toggleSidebar()`

### Notes

- не заводи этот store заранее без реальной необходимости

## Store Relations

### `transactionsStore` depends on `categoriesStore`

Нужно для:

- отображения названия категории
- аналитики по категориям

### `budgetsStore` depends on `transactionsStore`

Нужно для:

- расчета потраченной суммы по категории
- сравнения фактических трат с лимитом

### `settingsStore` is used by UI and formatting composables

Нужно для:

- текущей валюты
- текущей локали
- темы интерфейса

## Suggested Types

```ts
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  date: string
  note: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
}

export interface Budget {
  id: string
  categoryId: string
  limit: number
  period: 'month'
}

export interface Settings {
  locale: 'ru' | 'en'
  currency: string
  theme: 'light' | 'dark'
}
```

## Persistence Strategy

Самый простой путь:

- `transactions` хранить в `localStorage`
- `categories` хранить в `localStorage`
- `budgets` хранить в `localStorage`
- `settings` хранить в `localStorage`

Можно сделать общий helper:

- `loadFromStorage(key)`
- `saveToStorage(key, value)`

И вызывать его внутри actions или через `watch` на store.

## What Not To Put In Stores

Не клади в store:

- состояние одного инпута
- временные ошибки одной формы
- состояние hover/dropdown, если оно локальное
- форматированные строки, которые легко получить на уровне UI

## Minimal Store Order

Если делать по очереди, то так:

1. `useSettingsStore`
2. `useCategoriesStore`
3. `useTransactionsStore`
4. `useBudgetsStore`

Так проще сначала поднять основу, потом уже строить аналитику и бюджеты.
