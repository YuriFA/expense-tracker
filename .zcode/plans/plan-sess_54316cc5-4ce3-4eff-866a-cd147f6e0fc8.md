# План: Input = чистый primitive + form presentation компоненты (apps/mobile)

## Контекст

- `Input` (`apps/mobile/src/shared/ui/input/input.tsx`) сейчас рендерит `label` над полем, `error`/`helperText` под полем и красит border/иконки от `error`. RHF/Zod он не импортирует — проблема только в presentation-ответственности.
- `BottomSheetInput` (`shared/ui/bottom-sheet/bottom-sheet-input.tsx`) — чистый passthrough, инжектит лишь `textInputComponent` (keyboard-интеграция @gorhom). Код меняться не будет.
- 8 call sites в 5 файлах. `error`/`errorTestId` используют только `new-category-sheet.tsx` и `new-account-sheet.tsx` (form-level ошибки mutation). `helperText`, `trailingIcon`, `containerClassName` не используются никем.
- Контракты, которые нельзя сломать: testID инпутов (`login-email-input`, `home-new-category-name`, …), видимость `home-new-category-error` / `accounts-create-error` с теми же триггерами (Maestro flow 06), `accessibilityRole="alert"` на error-тексте, spacing `gap-1.5` внутри поля и `gap-4` между полями.

## Изменения

### 1. Новый slice `apps/mobile/src/shared/ui/form/`

По прецеденту `shared/ui/bottom-sheet/` (несколько маленьких связанных компонентов в одном slice + один barrel). Внутренние импорты — relative (`'../text'`), как в `input.tsx`.

- **`form-field.tsx`** — `FormField`: `<View className={cn('gap-1.5', className)}>` с passthrough остальных ViewProps. Только layout/composition; `gap-1.5` сохраняет текущий spacing label↔input↔error.
- **`form-label.tsx`** — `FormLabel`: `<Text variant="label" className={className}>`, только label.
- **`form-error.tsx`** — `FormError`: рендерит `null` при пустом children, иначе `<Text variant="caption" className="text-destructive" accessibilityRole="alert" testID={testID}>`. Точная семантика нынешнего `{error && …}` + a11y.
- **`index.ts`** — barrel: три компонента + типы.
- **`form.test.tsx`** — маленький co-located тест по конвенции репо (как speed-dial): FormError скрыт при пустом children и виден с alert role + testID при непустом; FormField/FormLabel рендерят children.

`FormDescription` не создаю — у `helperText` ноль использований. Никаких form-state/RHF/Zod знаний ни в одном из компонентов.

### 2. `Input` → чистый primitive (`input.tsx`)

- Удалить: props `label`, `error`, `helperText`, `errorTestId`, их рендер, import `Text`, внешний wrapper `gap-1.5`.
- Добавить `invalid?: boolean` — визуальное состояние самого поля: `border-destructive` vs `border-border` и `accent-destructive` у иконок (сохраняет текущий error visual state; задача такой prop явно допускает).
- Оставить: `leadingIcon`, `trailingIcon` (intrinsic accessories), `containerClassName` (мерджится на единственный оставшийся row-View), `textInputComponent`/`InputComponentProps`, полный TextInputProps passthrough (`testID`, a11y, keyboardType и т.д.).
- `placeholder` течёт через spread; fallback `Enter ${label}` удаляется — все 8 call sites передают placeholder явно, поведение не меняется.
- Структура: один `<View className={cn('flex-row items-center', containerClassName)}>` с иконками и инпутом; doc-комментарий обновить (Input — primitive, label/error живут в `shared/ui/form`).

### 3. `BottomSheetInput` — код не меняется

Passthrough автоматически наследует суженный `InputProps`. Keyboard/accessibility интеграция и архитектура «листовой обёртки над Input» не тронуты; form-aware он не становится.

### 4. Обновление 8 call sites

- `pages/login/ui/login-screen.tsx` (2 поля), `pages/register/ui/register-screen.tsx` (3): каждое поле →
  ```tsx
  <FormField>
    <FormLabel>Email</FormLabel>
    <Input placeholder="Введите email" … testID="login-email-input" />
  </FormField>
  ```
  Form-level error Text и submit — без изменений.
- `features/create-transaction/ui/new-transaction-sheet.tsx` (Сумма): FormField + FormLabel; form-level error внизу формы — без изменений.
- `pages/dashboard/ui/new-category-sheet.tsx` (Название, с ошибкой):
  ```tsx
  <FormField>
    <FormLabel className={error ? 'text-destructive' : undefined}>Название</FormLabel>
    <BottomSheetInput placeholder="Например, Транспорт" value={name} onChangeText={setName}
      invalid={Boolean(error)} testID="home-new-category-name" />
    <FormError testID="home-new-category-error">{error}</FormError>
  </FormField>
  ```
- `pages/accounts/ui/new-account-sheet.tsx`: поле «Название» — как выше (FormError c testID `accounts-create-error`); «Начальный баланс» — FormField + FormLabel без ошибки.

Результат: testID инпутов на месте, error testID видимы с теми же триггерами, destructive border/label при ошибке сохранены, spacing/типографика идентичны.

Ручные заголовки `<Text variant="label">` у не-input секций шитов (Откуда/Куда/Счёт/Валюта/Иконка/Цвет) не трогаю — это не usages `Input`; унификация с FormLabel — отдельная задача.

### 5. `apps/mobile/docs/conventions/forms.md` — точечные правки

Обновить только примеры, где `Input`/`BottomSheetInput` получают `label=`/`error=` (§1 create-account-form, §2 amount-field), на новую композицию FormField/FormLabel/FormError + `invalid`. Остальные секции (RHF-паттерны, селекторы, §3–7) — без изменений. Это попадает под оговорку задачи «если это требуется для описания уже существующего поведения компонентов».

## Что НЕ делаю

- Никакой миграции форм на RHF/Zod, никаких `ControlledInput`, deps не трогаю.
- OpenSpec, `AGENTS.md` не трогаю; business-логику, validation и submit — не меняю.

## Verification

Из `apps/mobile`: `pnpm type-check`, `pnpm lint`, `pnpm format`, `pnpm test`. Из корня: `pnpm knip`. Затем ревью `git diff` на узость scope. `pnpm test:e2e` (Maestro iOS, flow 06 — реальный guard для `home-new-category-error`) прогоню, если доступен симулятор; иначе явно отчитаюсь, что не запустилось.