# Redesign: Create Transaction Bottom Sheet (mobile)

Референс: `apps/mobile/docs/image (4).png` — почти полноэкранный чистый лист: строка счёта «Выберите счёт ›», крупная сумма, горизонтальные пилюли категорий с иконками + кнопка «☰», нижний ряд действий (заметка 💬, дата 📅 Сегодня, круглая галочка ✓), внизу — кастомный цифровой кейпад 4×3 (1–9, «,», 0, ⌫). Системная клавиатура для суммы не используется вовсе.

## Что уже есть (результат исследования)

- **Шит**: `features/create-transaction/ui/new-transaction-sheet.tsx` — контейнер (snapPoints `['65%']`, заголовок «Новый расход/доход/перевод»), открывается SpeedDial-ом из `app/(tabs)/_layout.tsx` с фиксированным `kind`. Форма — `new-transaction-form.tsx` (FormProvider + RHF + zod-union).
- **Схема** `model/schema.ts`: `z.discriminatedUnion('kind', …)`; сумма — строка, валидируется через `parseMajorUnitsToMinor`; конвертация в минорные единицы — только в `toTransactionPayload`. Нет полей заметки и даты (`description: ''`, `occurredAt: now` захардкожены).
- **Поля**: `AmountField` (BottomSheetInput + системная decimal-pad клавиатура), `AccountField`/`CategoryField`/`FromAccountField`/`ToAccountField` — чипы `OptionRow` (`option-select.tsx`). У `ToAccountField` — вывод кандидатов «та же валюта ≠ источник» (UI-level, вне схемы).
- **Submit**: `useCreateTransaction` → локальный SQLite-репозиторий + outbox-синк; успех → `form.reset` + `dismiss` (известный `TODO(sheet-dismiss)` сохраняется); ошибка → `form.setError('root', …)` через `getRepositoryErrorText`; блокировка двойного сабмита.
- **BottomSheet-обёртка** `shared/ui/bottom-sheet/bottom-sheet.tsx`: `BottomSheetModal`, императивный ref, кастомный backdrop; `keyboardBehavior` не задан (дефолт gorhom `interactive`); `backgroundStyle`/`handleIndicatorStyle` сознательно `Omit`-ятся. Инпуты в шитах обязаны идти через `BottomSheetInput` (`BottomSheetTextInput`) — только он регистрируется в keyboard-состоянии шита.
- **Стек листов**: в приложении пока нет ни одного шита поверх другого — пикеры будут первым использованием (провайдер уже смонтирован в корневом `_layout.tsx`, внутри data-провайдеров).
- **Дата/деньги**: дата-библиотек нет; есть `relativeDayLabel` («Сегодня/Вчера/14 АВГ.») в `shared/lib/format/format.ts`; `formatMoney`/`formatAmount` (₽ по умолчанию); `Category` несёт `icon` (Ionicons) + `color` (hex), `Account` — `currency` + `balance`.
- **Контракты тестов**: testID `new-transaction-{sheet,amount,account,category,from,to,submit,error}`; Jest-харнесс `new-transaction-sheet.test.tsx`; Maestro `07-add-expense.yaml` (сейчас `inputText` в поле суммы — после редизайна невозможно).

## Решения (из неполученных ответов — беру рекомендованные)

1. **Transfer в том же шите**: панель категорий скрыта, вместо одной строки счёта — две «Откуда ›»/«Куда ›», открывающие тот же пикер-шит (для «Куда» — фильтр кандидатов «та же валюта ≠ источник» переносится как есть). Кейпад, заметка, дата, submit — общие для всех трёх видов.
2. **Календарь «Другой»** — собственная сетка месяца в BottomSheet, без новых зависимостей.
3. **Сумма без TextInput вообще** — только кастомный кейпад; значение остаётся строкой в RHF (формат «125,50»), парсинг через существующий `parseMajorUnitsToMinor`.
4. **Submit disabled-until-valid** (по §7 ТЗ): `mode: 'onChange'`, `disabled={!isValid || isPending}`. Это осознанная смена текущей submit-driven модели — тесты Jest и Maestro-флоу 07 обновляются (ассерт «кнопка задизейблена» вместо «ошибка после пустого сабмита»).

## Сохраняется как есть

- RHF + zod-union архитектура, FormProvider, lifecycle/reset (conventions forms.md §2/§3), `handle*`/`on*`.
- `useCreateTransaction`, репозиторий/outbox, маппинг ошибок по коду, блокировка повторного сабмита, `TODO(sheet-dismiss)`.
- `parseMajorUnitsToMinor`, `formatMoney`/`formatAmount`, `relativeDayLabel`, `useAccounts`/`useCategories`, SpeedDial-триггер и вёрстка `(tabs)/_layout.tsx` (не меняются).
- Префиксы testID `new-transaction-*`, существующие shared-примитивы (`Icon`, `Text`, `Pressable`, `FormError`, `IconButton`).

## Изменения по файлам

### `features/create-transaction/model/schema.ts` (правка)
- Добавить `description: z.string()` (default `''`) и `occurredAt: z.string()` (ISO, default «сейчас») во все три варианта юниона.
- Дефолты становятся функцией `createTransactionDefaultValues(kind)` (свежий `occurredAt` на каждое открытие), не константой. Стабильность ссылки для reset-эффекта — через `useMemo(..., [kind])` как сейчас.

### `features/create-transaction/model/amount-keypad.ts` (новый)
- Чистая функция `applyKeypadInput(value: string, key: KeypadKey): string` (`'0'–'9' | 'separator' | 'backspace'`): не больше одного разделителя, максимум 2 знака в дроби (все валюты — divisor 100), ограничение длины целой части, строки-состояния вида `"12,"` допустимы (парсер их переваривает). Форма сигнатуры `(value, key) → value` выбрана под будущие операторы `+ − × ÷` без переделки UI (§1 ТЗ).
- Юнит-тесты `amount-keypad.test.ts` (новый): сценарии §11 (0→1→12→12,5→12,50→⌫→12,5), защита от двойного разделителя, лимиты разрядов.

### `features/create-transaction/ui/` — UI-компоненты

| Файл | Статус | Содержание |
|---|---|---|
| `new-transaction-sheet.tsx` | правка | snapPoints `['90%']`, без титульного хедера (референс), тот же ref/onSuccess-контракт, большой верхний радиус через `backgroundStyle` |
| `new-transaction-form.tsx` | правка | `mode: 'onChange'`; композиция: строки счёта(ов) → сумма → категории (кроме transfer) → зона заметки → ряд действий (💬/📅/✓) → кейпад у низа; `toTransactionPayload` теперь проносит `description` и `occurredAt`; `useWatch` для валюты выбранного счёта |
| `amount-display.tsx` | новый | крупная сумма; символ валюты из выбранного счёта (fallback ₽, как `DEFAULT_CURRENCY` в format.ts); `numberOfLines={1}` + `adjustsFontSizeToFit` от переполнения; testID `new-transaction-amount` переезжает сюда |
| `amount-keypad.tsx` | новый | сетка 4×3 на Pressable, тонкие разделители, крупные цифры `text-foreground` / лёгкие символы `text-muted-foreground`; testID `new-transaction-key-{0-9,separator,backspace}`, a11y-лейблы («Запятая», «Стереть»); `pb-safe` для home-индикатора |
| `account-selector-row.tsx` | новый | строка «Выберите счёт ›» / имя счёта + chevron; проп `label` для «Откуда»/«Куда» (transfer) |
| `account-picker-sheet.tsx` | новый | шит поверх транзакционного: строки имя + валюта + приглушённый баланс; выбор → закрыть + `onChange`; проп исключения для «Куда» |
| `category-quick-bar.tsx` | новый | горизонтальный FlatList: ведущая кнопка «☰» (открывает полный пикер) + пилюли «иконка-в-кружке + имя»; выбранное — `border-primary bg-secondary` (язык текущих чипов); автоскролл: захват `onLayout` x/width каждого айтема, при выборе `scrollToOffset` с центрированием |
| `category-picker-sheet.tsx` | новый | полный список категорий с иконкой-в-цветном-круге (паттерн `expenses-sheet.tsx`) + имя; одиночный выбор → закрыть |
| `note-field.tsx` | новый | кнопка-пузырь с индикатором-точкой при непустой `description`; открытие — обычная условная вёрстка инпута **над** рядом действий (не абсолютное позиционирование, §5 ТЗ), `autoFocus`, `BottomSheetInput`; заметка живёт в RHF — переживает скрытие/переоткрытие; видимость — локальный `useState` (эпемерный UI-стейт по AGENTS.md) |
| `date-selector-row.tsx` | новый | «📅 Сегодня» (лейбл через `relativeDayLabel`); тап раскрывает ряд быстрых дат: Сегодня, Вчера, «2/3/4 дня назад», «5/6 дней назад» + «Другой» |
| `date-picker-sheet.tsx` | новый | собственный календарь: «‹ Август 2026 ›», ряд дней недели, сетка дней, подсветка выбранного/сегодня; выбор → закрыть + `onChange` |
| `transaction-submit-button.tsx` | новый | круглая кнопка с галочкой (Pressable + Icon, `rounded-full bg-primary`, disabled-прозрачность, спиннер при isPending); testID `new-transaction-submit` сохраняется |

### Удаляются (заменены, внешних потребителей нет — проверено)
`amount-field.tsx`, `account-field.tsx`, `category-field.tsx`, `from-account-field.tsx`, `to-account-field.tsx`, `option-select.tsx`. Баррель фичи `index.ts` не меняется (`NewTransactionSheet` + `TransactionFlowKind`).

### Shared-правки
- `shared/ui/bottom-sheet/bottom-sheet.tsx`: разрешить опциональный `backgroundStyle` (проброс вместо Omit) — дефолт для остальных шитов не меняется.
- `shared/lib/format/format.ts`: хелпер RU-плюрализации «N дня/дней назад» рядом с `relativeDayLabel`, с `TODO(i18n)`.

### Тесты / e2e
- `new-transaction-sheet.test.tsx` — переписать: ввод суммы нажатиями кейпада, disabled-until-valid, выбор счёта/категории через пикер-шиты, заметка (переживает скрытие), быстрые даты, transfer Откуда/Куда через пикер, ошибка репозитория в root-слот, блок двойного сабмита, полный reset.
- `jest.setup.js` — @gorhom-мок (Modal-семантика): проверить поддержку двух одновременно presented-модалей (транзакционный + пикер); расширять только если не справится.
- `.maestro/flows/07-add-expense.yaml` — переписать: сумма набивается тапами по `new-transaction-key-*` (никакого `inputText`), ассерт disabled → выбор → enabled → submit; убрать workaround-комментарии про reflow системной клавиатуры (они устаревают).
- Прогон полного quality bar: `pnpm type-check`, `lint`, `format`, `test`, `test:e2e` (dev build), `pnpm knip` на удалённые файлы.

## Анализ keyboard-поведения Gorhom (отдельно, §8 ТЗ)

- **Сумма**: кейпад — обычные View/Pressable, без фокуса → события клавиатуры не возникают, шит стоит на snap-point. Системная клавиатура не появляется никогда.
- **Заметка**: инпут идёт через `BottomSheetInput` → регистрируется в keyboard-состоянии шита → дефолтный `keyboardBehavior: 'interactive'` поднимает контент вместе с клавиатурой. Заметка рендерится над рядом действий, кейпад — ниже; системная клавиатура накрывает область кейпада, а ряд действий и инпут остаются видимыми. Проверить на iOS: панорамирование без дёрганий, кейпад не теряет состояние под клавиатурой, blur возвращает геометрию; если `interactive` с высоким (90%) шитом ведёт себя плохо — перейти на `keyboardBehavior: 'extend'` или `keyboardBlurBehavior` точечно в контейнере.
- **Стек шитов**: `BottomSheetModal` поддерживает презентацию поверх другого модала; хост-провайдер уже в корневом layout. Пикер закрывается → транзакционный шит нетронут (все состояния формы живут в RHF и не сбрасываются — §11 ТЗ).

## Риски

1. **Первое использование стека шитов** в приложении: и на устройстве, и в jest-моке @gorhom — главный технический риск, требует ранней проверки (спайк пикера в первую очередь после схемы).
2. **Interactive keyboard при 90% шита**: часть верха (сумма/категории) может уходить за экран, пока открыта заметка — приемлемо, но проверяется; выбор контейнера `BottomSheetView` (фикс) vs scroll-вариант влияет на панорамирование.
3. **Автоскролл пилюль категорий**: переменная ширина айтемов → центрирование по onLayout-захвату; edge-cases выбора из полного пикера и первого рендера.
4. **RU-плюрализация** «N дней назад» вручную (до i18n-врайринга) — TODO(i18n).
5. **occurredAt для прошлых дат**: сохраняем текущее время суток; дефолты-функция не должна ломать стабильность reset-эффекта (`useMemo` по `kind`).
6. **Maestro**: `inputText` больше не работает для суммы; порядок шагов и ассерты флоу 07 меняются; контракт `speed-dial-*` не трогаем.
7. **Форматирование промежуточных строк** суммы («12,») в amount-display — без float, группировка разрядов строки.
8. **Удаление 6 файлов полей** — проверено, потребителей вне фичи нет; knip подтвердит.

## Порядок реализации

1. Схема (`description`, `occurredAt`, дефолты-функция) + `amount-keypad` с юнит-тестами.
2. Спик стека шитов: пикер-шит поверх транзакционного (jest + устройство).
3. Контейнер шита (90%, радиус, без хедера) + скелет формы с текущими полями — держим зелёным.
4. Кейпад + amount-display вместо AmountField.
5. Строка счёта + пикер счетов (+ Откуда/Куда для transfer).
6. Категорийная панель + полный пикер + автоскролл.
7. Заметка (conditional layout + клавиатура — проверка на iOS).
8. Быстрые даты + календарь-шит.
9. Круглая submit-кнопка + live-validity.
10. Перепись Jest-харнесса и Maestro 07, полный quality bar (`type-check`, `lint`, `format`, `test`, `test:e2e`, `knip`).