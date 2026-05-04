<script setup lang="ts">
import { Field, FieldLabel, FieldSet } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAccountBalances } from '@/composables/use-account-balances'
import { useCurrencyFormatter } from '@/composables/use-currency-formatter'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { Field as VeeField } from 'vee-validate'

const accounts = useAccountsStore()
const { getAccountBalance } = useAccountBalances()
const { format } = useCurrencyFormatter()
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="accountId">
    <FieldSet :data-invalid="!!errors.length">
      <RadioGroup
        class="w-full flex gap-2 overflow-x-auto flex-wrap"
        :name="field.name"
        :model-value="field.value"
        :aria-invalid="!!errors.length"
        @update:model-value="field.onChange"
      >
          <FieldLabel
            v-for="account in accounts.items"
            :key="account.id"
            :for="`account-${account.id}`"
            class="w-auto!"
          >
            <Field
              orientation="horizontal"
              class="flex flex-col items-start gap-0 rounded-lg py-1! px-2! md:p-3!"
              :data-invalid="!!errors.length"
            >
            <RadioGroupItem
              :id="`account-${account.id}`"
              :value="account.id"
              :aria-invalid="!!errors.length"
              class="hidden"
            />
            <p class="text-sm text-muted-foreground">{{ account.name }}</p>
            <p class="text-md">
              {{ format(getAccountBalance(account.id) ?? 0) }}
            </p>
          </Field>
        </FieldLabel>
      </RadioGroup>
    </FieldSet>
  </VeeField>
</template>
