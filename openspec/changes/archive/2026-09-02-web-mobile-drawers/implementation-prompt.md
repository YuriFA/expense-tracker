# План-промпт: реализация change `web-mobile-drawers`

> Самодостаточный промпт для implementing-агента. Работать по
> `openspec/changes/web-mobile-drawers/tasks.md` строго по порядку. Этот
> документ фиксирует принятые решения и ограничения — их нельзя менять по
> ходу реализации; если что-то не сходится, остановиться и поднять вопрос.

## Миссия

В `apps/web` (Vue 3, FSD): на вьюпортах <768px модальные поверхности
(формы, списки, фильтры) и пикеры (account, category, date) открываются как
bottom-sheet drawer'ы; на ≥768px остаётся текущее поведение без изменений.
Change осознанно разворачивает решение D1 («dialogs instead of mobile bottom
sheets», change `2026-08-27-web-screens-parity`); delta уже лежит в
`openspec/changes/web-mobile-drawers/specs/web-screens/spec.md`.

Перед стартом прочитать: корневой `AGENTS.md`, `apps/web/AGENTS.md`,
`apps/web/docs/ARCHITECTURE.md`,
`apps/web/docs/conventions/vue-patterns.md` (§3 — формы, §4 — списки и
диалоги), `openspec/changes/web-mobile-drawers/` (proposal/design/tasks),
`openspec/specs/web-screens/spec.md`, и для паритета —
`openspec/specs/mobile-forms/spec.md` (требование о доступности содержимого
всех шитов стопки, строки 112–118).

## Зафиксированные решения (не переоткрывать)

1. **Примитив — встроенный Drawer из reka-ui 2.10.3** (уже установлен:
   `DrawerRoot/DrawerPortal/DrawerContent/DrawerHandle/DrawerTitle/
   DrawerDescription/DrawerClose/DrawerSwipeArea`; snap-points,
   swipe-direction, `v-model:open` с reason'ами закрытия,
   `data-nested-drawer-open`). **vaul-vue и любые новые зависимости
   запрещены.** Текущий shadcn-vue Drawer построен на этом же примитиве —
   его шаблон можно брать за основу стилизации.
2. **Брейкпоинт 768px** — тот же `useMediaQuery('(min-width: 768px)')`, что в
   `AppShell.vue`. `<768px` — drawer, `≥768px` — текущие центрированные
   диалоги; десктоп пиксельно не меняется.
3. **Обёртка — явный `shared/ui/responsive-dialog`** (v-model:open + слоты
   title/description/default/footer). Вызовы мигрируют заменой импорта.
   НЕ делать существующий `Dialog` «responsive изнутри».
4. **Охват**: 23 центрированных Dialog + фильтры-Sheet → responsive-презентация
   на мобиле. Исключения (не трогать): 6 AlertDialog (OwnershipGate,
   DeleteTransaction, DeleteAccount, DissolveHousehold, LeaveHousehold,
   RemoveMember), CommandPalette (desktop-only), Popover+RangeCalendar в
   `TransactionsDateFilter` (остаётся внутри drawer'а фильтров), нативный
   `<input type="date">` в `PlanFormDialog`.
5. **Стековые пикеры**: account/category — через responsive-вариант в
   `shared/ui/select` внутри `AccountSelect`/`CategorySelect` (потребители
   этих двух компонентов не меняются); дата — новый `shared/ui/date-field`
   (десктоп: Popover+Calendar как сейчас; мобила: quick-date чипы +
   календарь-drawer); `NewCategoryDialog` — через responsive-dialog
   (стек dialog-in-drawer проверяется в пилоте).
6. **Свайп-закрытие разрешено везде, dirty-guard НЕ делаем** (паритет с RN;
   reason из `update:open` оставляет возможность добавить guard позже через
   контролируемый open — у reka Drawer нет пропа `dismissible`).
7. **Один change, пилот-первый**: §2 tasks.md — гейт; без прохождения его
   чеклиста §3 не начинать.

## Жёсткие ограничения

- Никаких изменений в `packages/*`, `apps/mobile/`, `backend/`, OpenAPI.
- Без новых `watch()` в production-коде (бюджет приложения — два watch;
  реактивность через computed/события; `useMediaQuery` — computed).
- Формы функционально не меняются: vee-validate + Zod схемы, money-majors на
  форме, `toMinorUnits` один раз на сабмите (vue-patterns §3).
- FSD: новые примитивы только в `shared/ui/<component>/` (папка SFC-частей +
  `index.ts` barrel, стиль `sheet/`); доменные обёртки остаются в своих
  слоях; `pnpm exec steiger src` остаётся зелёным.
- Дефект `TransactionsItemsList.vue` (общий `editOpen`/`deleteOpen` на все
  строки, docs/technical-debt.md:57) переносим «как есть», не чиним заочно.
- Существующие testid'ы сохраняются; e2e правится только там, где меняется
  презентация на мобиле.
- Новые i18n-ключи — в `packages/i18n` ru+en, гейт `pnpm i18n:lint`.
- knip: все новые экспорты должны использоваться; `pnpm arch:check` зелёный.
- `responsive-dialog` должен позволять тестам фиксировать презентацию (мок
  matchMedia или inject-переопределение), иначе jsdom-среда по умолчанию
  даст мобильную ветку и сломает существующие десктоп-ассерты.

## Порядок работы

1. **§1 tasks.md — примитивы**: `drawer/` → `responsive-dialog/` →
   responsive-вариант select → переподключение `AccountSelect`/`CategorySelect`
   → `date-field/`.
2. **§2 tasks.md — пилот** `AddTransactionDialogHost` (+ `NewCategoryDialog`,
   + формы с пикерами). Чеклист пилота на 390×844 (обычный браузер + PWA
   standalone):
   - стек drawer'ов (форма → пикер аккаунта/категории/даты) корректно
     открывается и закрывается, фон заблокирован;
   - всё открытое содержимое стопки доступно в a11y-дереве (зеркало
     mobile-forms:112–118; проверить инспектором доступности);
   - клавиатура не перекрывает ввод; скролл длинного содержимого внутри
     dvh-ограниченного drawer'а работает;
   - `env(safe-area-inset-bottom)` в standalone-режиме;
   - свайп-вниз закрывает; десктопное поведение (≥768px) не изменилось.
   Только после прохождения — §3. Найденные проблемы примитивов чинить до
   роллаута.
3. **§3 tasks.md — механический роллаут**: замена импорта Dialog →
   responsive-dialog по списку поверхностей из tasks.md (пути указаны).
4. **§4 — фильтры**: `TransactionsFiltersSheet` <768px — нижний drawer
   (убрать мобильную актуальность `sm:max-w-[400px]`), ≥768px — правый Sheet
   как сейчас.
5. **§5–6 — тесты и docs**: юнит-тесты новых примитивов по образцу
   `shared/ui/amount-field/AmountField.test.ts` +
   `src/__tests__/helpers/mount-with-providers.ts` (учесть Teleport у
   drawer'а); существующие десктоп-ассерты проходят без правок; e2e
   backendless + PWA. Docs — vue-patterns §4 (конвенция overlay'ев:
   контейнер владеет презентацией/жизненным циклом, форма — состоянием;
   список исключений), ARCHITECTURE.md, обновить комментарии со старой D1
   (`DebtorHistoryDialog.vue:29`, `CategoryCashflowDialog.vue:31`).
6. **§7 — гейты**: в `apps/web` — type-check, oxlint+eslint, `pnpm test:unit`,
   `pnpm exec steiger src`; в корне — `pnpm knip`, `pnpm arch:check`; e2e
   backendless + PWA сюиты.
7. **Финализация**: чекбоксы tasks.md проставлять по ходу; в конце —
   openspec sync-specs (delta → `openspec/specs/web-screens/spec.md`), затем
   архивация change (скилл openspec-archive-change). Коммиты по логическим
   шагам (примитивы / пилот / роллаут / фильтры / тесты+docs), стиль
   сообщений — conventional commits, как в git log.

## Отчёт по завершении

- Список мигрированных поверхностей и новых компонентов.
- Результаты всех гейтов (команда → статус).
- Любые отклонения от решений выше — их нельзя принимать молча: остановиться
  и поднять вопрос пользователю.
