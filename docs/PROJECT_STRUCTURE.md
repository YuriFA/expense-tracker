# Project Structure

Ниже структура, которая подходит для небольшого, но уже взрослого Vue-проекта без лишнего усложнения.

## Recommended Structure

```text
src/
  app/
    i18n/
      index.ts
      locales/
        en.ts
        ru.ts
    router/
      index.ts
      routes.ts
    providers/
      index.ts
  assets/
  components/
    analytics/
    dashboard/
    layout/
    settings/
    transactions/
    ui/
  composables/
  constants/
  pages/
    AnalyticsPage.vue
    DashboardPage.vue
    SettingsPage.vue
    TransactionsPage.vue
  stores/
    budgets.ts
    categories.ts
    settings.ts
    transactions.ts
  types/
    budget.ts
    category.ts
    settings.ts
    transaction.ts
  utils/
  App.vue
  main.ts
```

## Directory Responsibilities

### `app/`

Техническая точка входа приложения.

Сюда выноси:

- настройку роутера
- настройку `i18n`
- провайдеры и app-level initialization

### `components/`

Переиспользуемые визуальные блоки.

Делить по фичам удобно, потому что проект быстро растет:

- `dashboard/` - карточки и виджеты дашборда
- `transactions/` - список, фильтры, формы, модалки
- `analytics/` - графики, summary блоки, селекторы периода
- `settings/` - переключатели языка, темы, валюты
- `layout/` - shell, header, nav
- `ui/` - базовые кнопки, инпуты, карточки, модалки

### `pages/`

Маршрутные страницы.

Страница должна:

- собирать экран из компонентов
- подключать store/composables
- не содержать слишком много чистой бизнес-логики

### `stores/`

Здесь лежат `Pinia` stores.

Они отвечают за:

- source of truth
- CRUD-операции
- derived state на уровне доменной модели
- persistence orchestration

### `types/`

Все основные типы домена.

Храни отдельно:

- `transaction.ts`
- `category.ts`
- `budget.ts`
- `settings.ts`

### `composables/`

Сюда выноси повторяемую реактивную логику, которая не является store.

Подходит для:

- форматирования валюты и даты
- локальных фильтров
- theme handling
- агрегаций и вычислений для UI

### `utils/`

Чистые функции без Vue-зависимостей.

Примеры:

- сортировка транзакций
- группировка по месяцам
- расчет сумм
- нормализация импортируемых данных

### `constants/`

Константы проекта:

- дефолтные категории
- список валют
- список supported locales
- route names

## Design Rules

- Держи route-level код в `pages/`, а не в `components/`.
- Не складывай все компоненты в один общий каталог без фич-группировки.
- Не выноси в store то, что нужно только одной форме локально.
- Бизнес-вычисления, которые нужны в нескольких местах, выноси в `utils/` или `composables/`.
- Если логика стала общей для нескольких страниц, только тогда поднимай ее выше.

## Minimal First Version

Если хочешь стартовать быстрее, можно начать даже с такого минимума:

```text
src/
  components/
  pages/
  stores/
  types/
  composables/
  App.vue
  main.ts
```

Потом уже разнести `app/`, `constants/`, `utils/` и feature-папки.

## Good Separation Example

### Хорошо

- страница получает данные из store
- store хранит транзакции
- `utils` считает агрегаты
- компонент только отображает результат

### Плохо

- компонент сам фильтрует, считает, форматирует и еще пишет в `localStorage`

## Growth Path

Когда проект вырастет, можно перейти к структуре по фичам:

```text
src/
  features/
    analytics/
    budgets/
    settings/
    transactions/
```

Но для короткого pet-проекта текущая структура проще и понятнее.
