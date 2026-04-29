# Stage 2. Base Architecture

## Goal

Собрать доменную основу приложения: типы, дефолтные справочники, `Pinia` stores и persistence, чтобы все последующие фичи опирались на единый source of truth.

## Context

Из `PROJECT_STRUCTURE.md` важно разделение ответственности между `stores/`, `types/`, `constants/`, `composables/` и `utils/`.

Из `STORE_SCHEMA.md` нужно взять конкретную схему state, getters, actions и порядок внедрения stores:

1. `useSettingsStore`
2. `useCategoriesStore`
3. `useTransactionsStore`
4. `useBudgetsStore`

## What To Build

- Доменные типы `Transaction`, `Category`, `Budget`, `Settings`.
- Константы с дефолтными категориями и базовыми справочниками.
- Четыре основных `Pinia` store по схеме проекта.
- Механизм загрузки и сохранения данных в `localStorage`.
- Четкое разделение между state, actions, getters и UI-логикой.

## Detailed Tasks

1. Создать отдельные типы в `src/types/`:
   - `transaction.ts`
   - `category.ts`
   - `budget.ts`
   - `settings.ts`
2. Вынести общие типы и литералы, например `TransactionType = 'income' | 'expense'`.
3. Описать интерфейсы в соответствии с `STORE_SCHEMA.md`:
   - `Transaction`
   - `Category`
   - `Budget`
   - `Settings`
4. Создать `src/constants/` и добавить туда дефолтные категории доходов и расходов.
5. При необходимости добавить константы поддерживаемых валют, локалей и route names.
6. Реализовать `useSettingsStore`:
   - state: `locale`, `currency`, `theme`
   - actions: `setLocale`, `setCurrency`, `setTheme`, `hydrate`
7. Реализовать `useCategoriesStore`:
   - state: `items`
   - getters: `incomeCategories`, `expenseCategories`, `findById`
   - actions: `loadDefaults`, `addCategory`, `updateCategory`, `removeCategory`, `replaceAll`
8. Реализовать `useTransactionsStore`:
   - state: `items`, `isLoaded`
   - getters: `sortedTransactions`, `incomeTransactions`, `expenseTransactions`, `totalIncome`, `totalExpense`, `balance`, `recentTransactions`
   - actions: `load`, `addTransaction`, `updateTransaction`, `removeTransaction`, `replaceAll`
9. Реализовать `useBudgetsStore`:
   - state: `items`
   - getters: `monthlyBudgets`, `findByCategoryId`
   - actions: `setBudget`, `removeBudget`, `replaceAll`
10. Сделать общий helper или набор helpers для `localStorage`:
   - `loadFromStorage(key)`
   - `saveToStorage(key, value)`
11. Подключить persistence для всех четырех доменных областей.
12. Продумать правила загрузки дефолтных категорий при первом запуске.
13. Определить поведение при удалении категории:
   - либо запретить удаление, если есть связанные транзакции
   - либо заранее описать стратегию отвязки
14. Проследить, чтобы в store не попадало локальное UI-состояние форм, модалок и инпутов.

## Dependencies

- Требует готового приложения и структуры каталогов из Stage 1.
- Является базой для транзакций, dashboard, analytics, settings, budgets и import/export.
- Persistence должен быть согласован с будущим import/export, чтобы не пришлось менять формат данных позже.

## Acceptance Criteria

- Все доменные типы созданы и используются в коде.
- Есть дефолтные категории доходов и расходов.
- Реализованы `settings`, `categories`, `transactions`, `budgets` stores.
- State/getters/actions соответствуют `STORE_SCHEMA.md` или отклонения явно обоснованы.
- Данные каждого store переживают перезагрузку страницы через `localStorage`.
- В stores нет локального UI-состояния, не относящегося к доменной модели.

## Notes

- Сложные вычисления, которые нужны в нескольких местах, лучше выносить в `utils/` или `composables/`, а не раздувать store.
- Форматируемые строки валют и дат не нужно хранить в store, их лучше получать на уровне UI.
- Порядок внедрения stores лучше сохранить, как описано в `STORE_SCHEMA.md`, чтобы проще поднимать зависимости.
