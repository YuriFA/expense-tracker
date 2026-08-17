# Mobile form conventions

This document contains canonical examples for forms in `apps/mobile`. The
form stack is React Hook Form + Zod + `@hookform/resolvers` (`zodResolver`),
adopted by the `adopt-rhf-zod-forms` OpenSpec change and installed in
`apps/mobile/package.json`.

These are reference implementations, not copy-paste templates. Adapt names,
fields, validation rules, and layout to the feature.

---

## 1. Simple page form

Use this pattern for a small, flat form.

```text
Page
└── Form
    ├── Input
    ├── Input
    └── Button
```

model/schema.ts

```typescript
import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'Введите название счёта'),
  currency: z.string().min(1, 'Выберите валюту'),
})

export type CreateAccountFormValues = z.infer<typeof createAccountSchema>
```

ui/create-account-form.tsx

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'

import { CurrencySelector } from '@/entities/account/ui/currency-selector'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

import {
  createAccountSchema,
  type CreateAccountFormValues,
} from '../model/schema'

interface CreateAccountFormProps {
  onSuccess: () => void
}

export function CreateAccountForm({ onSuccess }: CreateAccountFormProps) {
  const form = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: '',
      currency: '',
    },
  })

  const createAccount = useCreateAccount()

  const handleSubmit = async (values: CreateAccountFormValues) => {
    await createAccount.mutateAsync(values)
    onSuccess()
  }

  return (
    <View className="gap-4">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Название"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="currency"
        render={({ field, fieldState }) => (
          <CurrencySelector
            value={field.value}
            onSelect={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <Button
        text="Сохранить"
        loading={form.formState.isSubmitting || createAccount.isPending}
        disabled={createAccount.isPending}
        onPress={form.handleSubmit(handleSubmit)}
      />
    </View>
  )
}
```

Important points:

- `useForm` owns field state; Zod owns validation.
- `Controller` connects custom RN components to RHF.
- `form.handleSubmit(handleSubmit)` is the submit boundary — `handleSubmit` is
  the internal handler per the `handle*`/`on*` rule (see `apps/mobile/AGENTS.md`).
- `onSuccess` is a callback prop.
- API/domain transformation belongs between form values and the mutation when
  required.

## 2. Complex form with FormProvider

Use FormProvider when a form consists of multiple nested fields or sections.

```text
Page
└── FormProvider
    └── Form
        ├── AmountField
        ├── AccountField
        └── CategoryField
```

model/schema.ts

```typescript
import { z } from 'zod'

import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'

export const createTransactionSchema = z.object({
  amount: z
    .string()
    .min(1, 'Введите сумму')
    .refine((value) => {
      const minor = parseMajorUnitsToMinor(value)
      return minor !== null && minor > 0
    }, 'Некорректная сумма'),
  accountId: z.string().min(1, 'Выберите счёт'),
  categoryId: z.string().min(1, 'Выберите категорию'),
})

export type CreateTransactionFormValues = z.infer<
  typeof createTransactionSchema
>
```

The amount stays a **string** in form values. The schema only checks that the
string parses to a positive int64 minor-units amount (via the shared
`parseMajorUnitsToMinor`, which returns `null` for unparseable input) — it
never converts the amount or builds the API payload. The money conversion to
minor units happens in the named mapper at the submission boundary (section 4).

### Mutually exclusive modes: discriminated union

When one form serves several mutually exclusive modes — expense / income /
transfer — model the values as `z.discriminatedUnion` on the mode key, one
`z.object()` per mode. Do not flatten every mode into a single `z.object()`
with `optional()` fields: that loses the "these fields exist together in this
mode" invariant and invites non-null assertions downstream.

```typescript
const amountField = z
  .string()
  .min(1, 'Введите сумму')
  .refine((value) => {
    const minor = parseMajorUnitsToMinor(value)
    return minor !== null && minor > 0
  }, 'Некорректная сумма')

export const createTransactionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('expense'),
    amount: amountField,
    accountId: z.string().min(1, 'Выберите счёт'),
    categoryId: z.string().min(1, 'Выберите категорию'),
  }),
  z.object({
    kind: z.literal('income'),
    amount: amountField,
    accountId: z.string().min(1, 'Выберите счёт'),
    categoryId: z.string().min(1, 'Выберите категорию'),
  }),
  z.object({
    kind: z.literal('transfer'),
    amount: amountField,
    fromAccountId: z.string().min(1, 'Выберите счёт списания'),
    toAccountId: z.string().min(1, 'Выберите счёт зачисления'),
  }),
])

export type CreateTransactionFormValues = z.infer<
  typeof createTransactionSchema
>
```

The invariant lives in the schema and its inferred types — never recover it
with non-null assertions (`values.toAccountId!`) or re-validation in the
handler. Narrow on the discriminator instead:

```tsx
const handleSubmit = async (values: CreateTransactionFormValues) => {
  if (values.kind === 'transfer') {
    // values.fromAccountId / values.toAccountId are plain required strings
    // here — narrowed by the discriminator, no `!` needed.
  }
}
```

`defaultValues` is one complete variant of the union for the current mode;
switching modes re-initializes the form with the new mode's defaults (the
reset lifecycle in section 3), and mode-specific fields render conditionally
per variant.

ui/create-transaction-form.tsx

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { View } from 'react-native'

import { Button } from '@/shared/ui/button'

import {
  createTransactionSchema,
  type CreateTransactionFormValues,
} from '../model/schema'
import { AccountField } from './account-field'
import { AmountField } from './amount-field'
import { CategoryField } from './category-field'

interface CreateTransactionFormProps {
  onSuccess: () => void
}

export function CreateTransactionForm({
  onSuccess,
}: CreateTransactionFormProps) {
  const form = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: '',
      accountId: '',
      categoryId: '',
    },
  })

  const createTransaction = useCreateTransaction()

  const handleSubmit = async (values: CreateTransactionFormValues) => {
    const payload = toCreateTransactionPayload(values)

    await createTransaction.mutateAsync(payload)

    onSuccess()
  }

  return (
    <FormProvider {...form}>
      <View className="gap-4">
        <AmountField />
        <AccountField />
        <CategoryField />

        <Button
          text="Сохранить"
          loading={form.formState.isSubmitting || createTransaction.isPending}
          onPress={form.handleSubmit(handleSubmit)}
        />
      </View>
    </FormProvider>
  )
}
```

ui/amount-field.tsx

```tsx
import { Controller, useFormContext } from 'react-hook-form'

import { BottomSheetInput } from '@/shared/ui/bottom-sheet'

import type { CreateTransactionFormValues } from '../model/schema'

export function AmountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()

  return (
    <Controller
      control={control}
      name="amount"
      render={({ field, fieldState }) => (
        <BottomSheetInput
          label="Сумма"
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          keyboardType="decimal-pad"
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
```

Text fields use `BottomSheetInput` (same props as `Input`) because this form
renders inside a Bottom Sheet (section 3): @gorhom ignores keyboard-show
events until the focused input registers with the sheet's keyboard state, and
only the sheet-aware variant does. Selectors and other non-text fields have
no such requirement.

ui/account-field.tsx

```tsx
import { Controller, useFormContext } from 'react-hook-form'

import { AccountSelector } from '@/entities/account/ui/account-selector'

import type { CreateTransactionFormValues } from '../model/schema'

export function AccountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()

  return (
    <Controller
      control={control}
      name="accountId"
      render={({ field, fieldState }) => (
        <AccountSelector
          value={field.value}
          onSelect={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
```

ui/category-field.tsx

```tsx
import { Controller, useFormContext } from 'react-hook-form'

import { CategorySelector } from '@/entities/category/ui/category-selector'

import type { CreateTransactionFormValues } from '../model/schema'

export function CategoryField() {
  const { control } = useFormContext<CreateTransactionFormValues>()

  return (
    <Controller
      control={control}
      name="categoryId"
      render={({ field, fieldState }) => (
        <CategorySelector
          value={field.value}
          onSelect={field.onChange}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
```

The important architectural property is that nested fields do NOT create their
own form state. They consume the parent form through `useFormContext`.

## 3. BottomSheet form

A BottomSheet should not become a giant form component.

Prefer:

```text
CreateTransactionSheet
└── CreateTransactionForm
    ├── AmountField
    ├── AccountField
    └── CategoryField
```

create-transaction-sheet.tsx

```tsx
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
} from '@/shared/ui/bottom-sheet'

interface CreateTransactionSheetProps {
  ref: React.Ref<BottomSheetRef>
}

export function CreateTransactionSheet({ ref }: CreateTransactionSheetProps) {
  const handleSuccess = () => {
    if (ref && typeof ref !== 'function') {
      ref.current?.dismiss()
    }
  }

  return (
    <BottomSheet ref={ref} snapPoints={['65%']}>
      <BottomSheetHeader title="Новая транзакция" />

      <BottomSheetBody>
        <CreateTransactionForm onSuccess={handleSuccess} />
      </BottomSheetBody>
    </BottomSheet>
  )
}
```

create-transaction-form.tsx — this is the same `CreateTransactionForm` shown
in section 2 above; the point of this section is that it needs **no changes**
to be reused inside a Bottom Sheet:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { View } from 'react-native'

import { Button } from '@/shared/ui/button'

import {
  createTransactionSchema,
  type CreateTransactionFormValues,
} from '../model/schema'
import { AccountField } from './account-field'
import { AmountField } from './amount-field'
import { CategoryField } from './category-field'

interface CreateTransactionFormProps {
  onSuccess: () => void
}

export function CreateTransactionForm({
  onSuccess,
}: CreateTransactionFormProps) {
  const form = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      amount: '',
      accountId: '',
      categoryId: '',
    },
  })

  const createTransaction = useCreateTransaction()

  const handleSubmit = async (values: CreateTransactionFormValues) => {
    const payload = toCreateTransactionPayload(values)

    await createTransaction.mutateAsync(payload)

    onSuccess()
  }

  return (
    <FormProvider {...form}>
      <View className="gap-4">
        <AmountField />
        <AccountField />
        <CategoryField />

        <Button
          text="Сохранить"
          loading={form.formState.isSubmitting || createTransaction.isPending}
          onPress={form.handleSubmit(handleSubmit)}
        />
      </View>
    </FormProvider>
  )
}
```

The sheet owns its lifecycle. The form owns its state and submission. The
form does not need to know that it happens to be rendered inside a
BottomSheet — no sheet refs, snap points, or dismissal logic leak into it.
Its text fields already use `BottomSheetInput` (see section 2), which is what
makes the no-changes reuse possible: keyboard handling is a property of the
input variant, not of the form. Text inputs rendered inside a sheet MUST use
`BottomSheetInput` — the plain `Input` leaves the sheet's
`keyboardBehavior` inert and hidden from the accessibility tree (Maestro
ids depend on it).

### Form lifecycle and reset

Reset is explicit and tied to the flow lifecycle — never assumed from
incidental remounts, and never assumed from opening/closing the sheet
(@gorhom keeps mounted sheets' state; a reopened sheet shows whatever the
form still holds):

- **After a successful submission**, explicitly return the form to its
  defaults so the next open starts clean:

  ```tsx
  const handleSubmit = async (values: CreateTransactionFormValues) => {
    const payload = toCreateTransactionPayload(values)

    await createTransaction.mutateAsync(payload)

    form.reset(defaultValues)
    onSuccess()
  }
  ```

- **When the flow restarts in a different mode** (e.g. the sheet reopens for
  expense vs. transfer), re-initialize the form with that mode's defaults:

  ```tsx
  const defaultValues = useMemo(
    () => ({ amount: '', kind, accountId: '', categoryId: '' }),
    [kind],
  )

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])
  ```

- A **remount/key strategy** (`<CreateTransactionForm key={kind} …>`) is fine
  when it is clearer than an effect. Pick one mechanism per flow — don't stack
  both.

What not to do: relying on the sheet's `kind` prop changing or the sheet
closing/opening to reset the form implicitly, or skipping reset after a
successful submit because "the sheet dismisses anyway".

## 4. Form values vs API payload

Do not couple the form shape to the API payload unnecessarily.

Example:

```typescript
type CreateTransactionFormValues = {
  amount: string
  accountId: string
  categoryId: string
}
```

The API may expect:

```typescript
type CreateTransactionPayload = {
  amount: number
  accountId: string
  categoryId: string
  occurredAt: string
}
```

Use an explicit mapper:

```typescript
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'

function toCreateTransactionPayload(
  values: CreateTransactionFormValues,
): CreateTransactionPayload {
  return {
    // The schema's refine guarantees parseability; the fallback only
    // satisfies the parser's `number | null` return type.
    amount: parseMajorUnitsToMinor(values.amount) ?? 0,
    accountId: values.accountId,
    categoryId: values.categoryId,
    occurredAt: new Date().toISOString(),
  }
}
```

For non-trivial mappings, keep this transformation in a named function rather
than constructing the payload inline in JSX.

## 5. Server and repository errors

When the repository/mutation call triggered by a submit fails, surface a
human-readable message at form level through RHF's `root` error slot. Derive
the message from the shared code-keyed mapping — `getRepositoryErrorText`
from `@/shared/lib/data/repository-errors-ru` — never from the HTTP status.
Do not reset the form on failure: entered values are kept so the user can
retry.

```tsx
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'

const handleSubmit = async (values: CreateTransactionFormValues) => {
  try {
    const payload = toCreateTransactionPayload(values)

    await createTransaction.mutateAsync(payload)

    onSuccess()
  } catch (error) {
    form.setError('root', { message: getRepositoryErrorText(error) })
  }
}
```

Render the form-level error above the submit control, with `role="alert"` so
it is announced:

```tsx
{form.formState.errors.root?.message != null && (
  <Text role="alert">{form.formState.errors.root?.message}</Text>
)}
```

- `form.setError('root', …)` writes RHF's form-level error slot; field-level
  errors keep coming from the Zod schema via the resolver.
- The mapping switches on the machine `RepositoryError.code` — the repo-wide
  rule is errors are mapped by code, not by HTTP status.
- While the submission is pending, the submit control stays blocked
  (`loading`/`disabled` from `formState.isSubmitting` / `isPending`, as in the
  examples above), so a retry is always deliberate.

## 6. Event naming

Full rule and rationale: `apps/mobile/AGENTS.md` → `handle*` vs `on*`. In
short: `on*` is a callback prop a component exposes; `handle*` is the internal
handler that implements it.

```typescript
interface AccountFieldProps {
  onAccountChange: (accountId: string) => void
}

function AccountField({ onAccountChange }: AccountFieldProps) {
  const handleAccountPress = (accountId: string) => {
    onAccountChange(accountId)
  }

  return <AccountSelector onSelect={handleAccountPress} />
}
```

## 7. What not to do

Avoid giant components such as:

```text
NewTransactionSheet
├── useState(amount)
├── useState(accountId)
├── useState(categoryId)
├── useState(error)
├── validation
├── canSubmit
├── payload construction
├── mutation
├── error mapping
├── BottomSheet lifecycle
├── all fields
└── all field rendering
```

Prefer:

```text
CreateTransactionSheet
└── CreateTransactionForm
    └── FormProvider
        ├── AmountField
        ├── AccountField
        └── CategoryField
```

The goal is not maximum component fragmentation. Split components when the
split creates a meaningful responsibility boundary.
