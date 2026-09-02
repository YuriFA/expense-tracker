<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { PlusIcon, X } from '@lucide/vue'
import type { Account } from '@expense-tracker/api'
import { DEFAULT_CURRENCY, toMinorUnits } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { AmountField } from '@/shared/ui/amount-field'
import { notification } from '@/shared/services/notification'
import { useCreateAccount } from '../model/use-accounts'
import { createAddAccountSchema, type AddAccountFormValues } from '../model/add-account-schema'

// Inline account creation for the transaction forms (the NewCategoryDialog
// contract): with zero accounts the transaction form is a dead end - the
// account selector is mandatory for every kind - so each selector offers a
// "+". The form shares its schema and mechanics with the accounts page
// AddAccountForm (one source of validation rules); the host form owns the
// created-account selection via the `created` event. The app is ruble-only,
// so currency is submitted fixed (currency-rub-only).

const emit = defineEmits<{
  created: [account: Account]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()
const { mutateAsync: createAccount, asyncStatus } = useCreateAccount()

const openingBalancePlaceholder = computed(() =>
  locale.value.startsWith('ru') ? '1000,00' : '1000.00',
)

const {
  handleSubmit: handleFormSubmit,
  setFieldValue,
  resetForm,
} = useForm<AddAccountFormValues>({
  validationSchema: toTypedSchema(createAddAccountSchema()),
  initialValues: {
    name: '',
    openingBalance: 0,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    const account = await createAccount({
      name: data.name,
      currency: DEFAULT_CURRENCY,
      openingBalance: toMinorUnits(data.openingBalance),
    })
    notification.success(t('addAccount.success'))
    emit('created', account)
    resetForm()
    open.value = false
  } catch (error) {
    notification.mutationError(error, {
      title: t('addAccount.error'),
      feature: 'account',
      action: 'create',
    })
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm" data-testid="new-account-dialog" :show-close-button="false">
      <DialogHeader class="-mx-6 -mt-6 flex-row items-center justify-between border-b px-6 pb-4 pt-6">
        <DialogTitle>{{ t('addAccount.newAccount') }}</DialogTitle>
        <DialogClose
          class="rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:outline-hidden"
        >
          <X class="size-5" />
          <span class="sr-only">{{ t('common.close') }}</span>
        </DialogClose>
      </DialogHeader>
      <form id="new-account-form" class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <VeeField v-slot="{ field, errors }" name="name">
          <Field :data-invalid="!!errors.length">
            <FieldLabel for="new-account-name">{{ t('addAccount.nameLabel') }}</FieldLabel>
            <Input
              id="new-account-name"
              v-bind="field"
              data-testid="new-account-name"
              :placeholder="t('addAccount.namePlaceholder')"
              :aria-invalid="!!errors.length"
            />
            <FieldError v-if="errors.length" :errors="errors" />
          </Field>
        </VeeField>

        <VeeField v-slot="{ field, errors }" name="openingBalance">
          <Field :data-invalid="!!errors.length">
            <FieldLabel for="new-account-opening-balance">
              {{ t('addAccount.openingBalanceLabel') }}
            </FieldLabel>
            <AmountField
              id="new-account-opening-balance"
              data-testid="new-account-opening-balance"
              :model-value="field.value"
              :currency="DEFAULT_CURRENCY"
              :errors="errors"
              :placeholder="openingBalancePlaceholder"
              @update:model-value="
                (value) => {
                  if (value !== undefined) {
                    setFieldValue('openingBalance', value)
                  } else {
                    setFieldValue('openingBalance', undefined as unknown as number)
                  }
                }
              "
            />
          </Field>
        </VeeField>

        <DialogFooter>
          <Button type="submit" :loading="asyncStatus === 'loading'">
            <PlusIcon class="size-4" />
            {{ t('actions.create') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
