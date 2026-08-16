# Mobile form conventions

This document contains canonical examples for forms in `apps/mobile`.

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

export const createTransactionSchema = z.object({
  amount: z
    .string()
    .min(1, 'Введите сумму')
    .refine((value) => {
      const parsed = Number(value.replace(',', '.'))
      return !Number.isNaN(parsed) && parsed > 0
    }, 'Некорректная сумма'),
  accountId: z.string().min(1, 'Выберите счёт'),
  categoryId: z.string().min(1, 'Выберите категорию'),
})

export type CreateTransactionFormValues = z.infer<
  typeof createTransactionSchema
>
```

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

import { Input } from '@/shared/ui/input'

import type { CreateTransactionFormValues } from '../model/schema'

export function AmountField() {
  const { control } = useFormContext<CreateTransactionFormValues>()

  return (
    <Controller
      control={control}
      name="amount"
      render={({ field, fieldState }) => (
        <Input
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
BottomSheet.

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
function toCreateTransactionPayload(
  values: CreateTransactionFormValues,
): CreateTransactionPayload {
  return {
    amount: parseMajorUnitsToMinor(values.amount),
    accountId: values.accountId,
    categoryId: values.categoryId,
    occurredAt: new Date().toISOString(),
  }
}
```

For non-trivial mappings, keep this transformation in a named function rather
than constructing the payload inline in JSX.

## 5. Event naming

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

## 6. What not to do

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
