# Architecture — Fractal FSD

Проект использует **Feature-Sliced Design v2.1** с расширением **Fractal FSD**: страницы могут содержать вложенный `features/` слой для page-local функционала.

## Слои (canonical FSD v2.1)

```
src/
├── app/          ← инициализация, провайдеры, роутинг
├── pages/        ← route-level композиция + nested features
├── features/     ← global, переиспользуемые фичи (2+ consumers)
├── entities/     ← доменные модели
└── shared/       ← инфраструктура без бизнес-логики
```

Импорт направлен строго вниз: `app → pages → features → entities → shared`. Cross-imports между слайсами одного слоя запрещены (через public API).

## Segments (canonical)

Каждый слайс организован в canonical сегментах:
- `ui/` — UI-компоненты
- `model/` — состояние, **бизнес-логика**, схемы валидации, composables
- `api/` — backend-интеграция, интерфейсы репозиториев, конкретные реализации хранилища
- `lib/` — утилиты слайса без бизнес-смысла
- `config/` — конфигурация

### Тест на принадлежность сегменту

| Вопрос | Ответ YES |
|---|---|
| Код знает о сети / хранилище / внешних системах? | → `api/` |
| Чистая бизнес-логика / правила домена / типы? | → `model/` |
| Если убрать localStorage и заменить на HTTP — этот код ещё нужен? | → `model/` |
| Код вызывается только из `api/`, но сам не знает про хранилище? | → `model/` |
| Утилиты только для этого слайса, без бизнес-смысла? | → `lib/` |
| Компоненты, форматтеры отображения? | → `ui/` |

**Пример:** `balance-calculator.ts` содержит чистую бизнес-логику (правила расчёта баланса — income прибавляет, expense вычитает, transfer дебетует/кредитует). Он не знает о localStorage. При замене на HTTP он остаётся нужным (оптимистичные обновления, тесты). Поэтому он живёт в `model/`, а не в `api/`, несмотря на то что вызывается только из `api/local-storage-repository.ts`.

```
entities/account/
  model/
    types.ts                     ← типы: Account, AccountWithBalance
    account.ts                   ← normalize/parse/serialize
    balance-calculator.ts        ← бизнес-логика расчёта баланса  ← model/, не api/
    use-accounts.ts              ← composables (useQuery/useMutation)
  api/
    repository.ts                ← интерфейс + InjectionKey
    local-storage-repository.ts  ← реализация (вызывает model/balance-calculator)
```

`api/` сегмент внутри слайса может импортировать из `model/` того же слайса — это валидный внутрислайсовый импорт.

## Custom структура `shared/`

Кроме canonical segments, `shared/` содержит два кастомных сегмента — это **не FSD v2.1 канон**, осознанный trade-off:

- `shared/services/` — инфраструктурные модули с side-эффектами (`notification` — обёртка над тостами с локализацией ошибок)
- `shared/store/` — глобальные Pinia-stores (`use-settings-store`)

### Flat-file сегменты без segment-barrel

Несколько сегментов используют flat-file структуру (`.ts` файлы напрямую в сегменте, без `index.ts` на корне сегмента):

| Сегмент | Содержимое | Паттерн |
|---|---|---|
| `shared/services/` | `notification/` (со своим `index.ts`) | nested public API |
| `shared/store/` | `use-settings-store.ts` | flat file |
| `shared/config/` | `app.ts`, `currencies.ts`, `locale.ts`, `settings.ts`, `storage-keys.ts` | flat files |

У steiger в правиле `fsd/no-public-api-sidestep` exception на такой паттерн есть только для `shared/ui/` и `shared/lib/`. Для перечисленных выше сегментов правило точечно отключено в `steiger.config.ts` — см. [`steiger.config.ts`](../steiger.config.ts).

Для `shared/lib/` (canonical) используется обычный FSD-паттерн с `index.ts` в каждой вложенной папке:
- `shared/lib/money/index.ts` реэкспортит `formatCurrency` → импорт через `@/shared/lib/money`
- `shared/lib/data/` — пока flat без barrel (will be fixed when steiger начнёт на него ругаться)

## Fractal расширение: `pages/*/features/`

**Не каноничный FSD v2.1, осознанный trade-off.**

Страницы могут содержать вложенный слой `features/` для функционала, который:
- Используется ТОЛЬКО на этой странице
- Не планируется к переиспользованию в других страницах
- Имеет чёткую границу (хочется удалять/расширять изолированно)

```
src/pages/accounts/
├── index.ts                              ← page public API (AccountsPage)
├── ui/                                   ← page-level UI
│   ├── AccountsPage.vue
│   └── AccountCard.vue
├── model/                                ← page-level model
└── features/                             ← ВЛОЖЕННЫЙ СЛОЙ (Fractal FSD)
    ├── add-account/
    │   ├── index.ts                      ← feature public API
    │   ├── ui/
    │   │   ├── AddAccountDialog.vue
    │   │   └── AddAccountForm.vue
    │   └── model/
    │       └── add-account-schema.ts
    └── delete-account/
        ├── index.ts
        └── ui/
            └── DeleteAccountDialog.vue
```

### Когда класть в `pages/*/features/` vs `src/features/`

| Критерий | `src/features/` (global) | `pages/*/features/` (local) |
|---|---|---|
| Используется в 2+ страницах | ✅ | ❌ |
| Используется в 1 странице, но планируется переиспользование | ✅ | ❌ |
| Используется в 1 странице, переиспользование не планируется | ❌ | ✅ |
| Доменная логика, отделённая от UI | Возможно | ❌ (лучше в `entities/`) |

### Promotion path (local → global)

Если page-local фича начинает использоваться в другой странице:

```bash
mv src/pages/accounts/features/add-account src/features/add-account
```

Затем обновить импорты в consumers с `'../features/add-account'` на `'@/features/add-account'`. Один PR.

### Demotion path (global → local)

Если глобальная фича стала использоваться только в одной странице — перенести в `pages/<page>/features/`.

## Steiger configuration

`steiger.config.ts` содержит три точечных override'а поверх `fsd.configs.recommended`:

1. **`fsd/no-reserved-folder-names: off`** для `./src/pages/**/features/**` — Fractal FSD: внутри nested features используются canonical segment names (`ui/`, `model/`, ...), это не нарушение.

2. **`fsd/public-api: off`** для `./src/shared/**` — segment-barrels не обязательны для shared (см. плоские сегменты выше).

3. **`fsd/no-public-api-sidestep: off`** для `./src/shared/{services,store,config}/**` — flat-file сегменты без segment-barrel (см. таблицу выше).

Актуальное состояние правил — в [`steiger.config.ts`](../steiger.config.ts). На момент написания steiger сообщает 0 ошибок типа `no-public-api-sidestep` (раньше было 18, пофикшено override'ами + `shared/lib/money/index.ts`).

## Import conventions

- **Между слайсами**: только через public API (`@/features/foo`, не `@/features/foo/ui/Bar.vue`)
- **Внутри слайса**: relative paths (`./ui/Bar.vue`, `../model/foo`)
- **Cross-page через router**: dynamic import с lazy loading (`() => import('@/pages/foo').then(m => m.FooPage)`)

## Что НЕ делает Fractal FSD

- Не разрешает `entities/` или `shared/` внутри pages (только `features/`)
- Не отменяет canonical segment names
- Не разрешает импорты вверх по слоям (`pages/features/X` → `pages/ui/Y` — можно; `pages/ui/Y` → `pages/features/X` — нельзя, нарушает layer direction)

## Почему Fractal, а не canonical inline

Canonical FSD v2.1 предписывает: single-use фичу инлайнить в segment страницы (`pages/accounts/ui/AddAccountForm.vue` без вложенной структуры). Это «размывает» фичу в одной папке.

Fractal подход сохраняет:
- **Группировку**: вся фича (ui + model + lib) в одной папке
- **Удаление**: `rm -rf pages/X/features/Y` — атомарная операция
- **Расширение**: добавить новый segment (`api/`, `lib/`) не ломает структуру
- **Promotion**: перенос папки = one-line operation

Trade-off: не каноничный FSD, нужна настройка Steiger и документирование конвенции (этот файл).

---

## Decision Tree: куда класть новый код

### Шаг 1: Это entity?

```
Есть собственный репозиторий (CRUD)?
+ Используется в 2+ независимых местах?
+ Имеет устойчивую идентичность (id)?
→ YES → entities/
→ NO  → шаг 2
```

**Entities этого проекта: Account, Category, Transaction. Только они.**

Budget при появлении — **не entity сразу**. Бюджет без транзакций не имеет смысла, это derived concept. Начинается в `pages/budget/`, переносится в `entities/` только если появится собственный репозиторий с CRUD и несколько независимых consumers.

### Шаг 2: Это feature?

```
Законченное user action (что-то делает пользователь)?
+ Используется в 2+ страницах?
→ YES → features/ (global)

Используется только в 1 странице, но нужна изоляция (ui + model вместе)?
→ YES → pages/X/features/ (Fractal FSD)

Простой компонент без собственной логики?
→ pages/X/ui/Component.vue
```

### Шаг 3: Это shared?

```
Не знает о доменных сущностях (Account, Transaction, Category...)?
Нет бизнес-правил, только инфраструктура / утилиты / UI-kit?
→ YES → shared/
→ NO  → это не shared
```

`formatCurrency()` → shared. `calculateBudgetProgress(budget, transactions)` → не shared.

### Шаг 4: Сомневаешься?

```
→ pages/ всегда.
Promotion (pages → features/entities) — когда точно ясно что 2+ consumers.
```

### Примеры для планируемых фич

| Что | Начальное размещение | Promotion при |
|---|---|---|
| Форма создания бюджета | `pages/budget/features/create-budget/` | Форма нужна на 2+ страницах |
| Прогресс-бар бюджета | `pages/budget/ui/BudgetProgress.vue` | Нужен на dashboard |
| Сущность Budget | `pages/budget/` сначала | Появится собственный репозиторий + 2+ consumers |
| Виджет бюджета на dashboard | → `widgets/budget-progress/` | Уже используется на 2 страницах |
| Экспорт в CSV | `pages/reports/features/export-csv/` | Нужен на 2+ страницах |
| Графики / charts | `pages/reports/ui/` | Нужны на 2+ страницах |
| Утилита форматирования дат для графиков | `pages/reports/lib/` сначала | Нужна в 2+ слайсах → `shared/lib/` |
