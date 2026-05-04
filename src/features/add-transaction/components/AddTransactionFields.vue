<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCY_SYMBOLS } from '@/shared/config/currencies'
import { useCategoriesStore } from '@/stores/use-categories-store'
import { useSettingsStore } from '@/stores/use-settings-store'
import { useFieldValue, Field as VeeField } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrentAccountField from './CurrentAccountField.vue'
import type { AddTransactionFormValues } from '../validation/add-transaction-schema'
import { MinusIcon, PlusIcon } from 'lucide-vue-next'
import { ButtonGroup } from '@/components/ui/button-group'
import { moneyMaskitoOptions } from '@/shared/lib/maskito'

const { t } = useI18n()
const typeField = useFieldValue<AddTransactionFormValues['type']>('type')
const categories = useCategoriesStore()
const settings = useSettingsStore()

const fiteredCategories = computed(() =>
  categories.items.filter((category) => category.type === typeField.value),
)
const currencySymbol = computed(
  () => CURRENCY_SYMBOLS[settings.currency as keyof typeof CURRENCY_SYMBOLS] ?? settings.currency,
)
</script>

<template>
  <FieldGroup
    class="rounded-xl border px-3 py-4 shadow-sm sm:px-4 gap-2 sm:py-5 md:flex-row md:flex-wrap md:items-start"
  >
    <VeeField v-slot="{ field, errors }" name="type">
      <Field class="w-full md:w-auto" :data-invalid="!!errors.length">
        <ButtonGroup
          orientation="horizontal"
          :aria-label="t('addTransaction.transactionType')"
          class="grid w-full grid-cols-2 md:inline-flex md:w-auto"
        >
          <Button
            variant="outline"
            class="w-full aria-pressed:bg-muted aria-pressed:text-green-500 md:w-11"
            :aria-pressed="field.value === 'income'"
            @click="field.onChange('income')"
          >
            <PlusIcon />
          </Button>
          <Button
            variant="outline"
            class="w-full aria-pressed:bg-muted aria-pressed:text-red-500 md:w-11"
            :aria-pressed="field.value === 'expense'"
            @click="field.onChange('expense')"
          >
            <MinusIcon />
          </Button>
        </ButtonGroup>
      </Field>
    </VeeField>

    <VeeField v-slot="{ field, errors }" name="amount">
      <Field class="w-full md:w-auto md:min-w-44" :data-invalid="!!errors.length">
        <ButtonGroup class="w-full md:w-auto">
          <Button
            variant="outline"
            disabled
            size="icon"
            :aria-label="t('addTransaction.currentCurrency')"
            :aria-invalid="!!errors.length"
            class="shrink-0"
          >
            {{ currencySymbol }}
          </Button>
          <Input
            id="amount"
            v-bind="field"
            v-maskito="moneyMaskitoOptions"
            :placeholder="t('addTransaction.amountPlaceholder')"
            :aria-invalid="!!errors.length"
            class="min-w-0"
          />
        </ButtonGroup>
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>
    <VeeField v-slot="{ field, errors }" name="description">
      <Field class="w-full md:min-w-56 md:flex-1" :data-invalid="!!errors.length">
        <Input
          id="description"
          :placeholder="t('addTransaction.descriptionPlaceholder')"
          v-bind="field"
          :aria-invalid="!!errors.length"
        />
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>
    <VeeField v-slot="{ field, errors }" name="category">
      <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!errors.length">
        <Select :name="field.name" :model-value="field.value" @update:model-value="field.onChange">
          <SelectTrigger
            id="cateogory"
            :aria-invalid="!!errors.length"
            class="w-full! min-w-0 md:min-w-36"
          >
            <SelectValue :placeholder="t('addTransaction.categoryPlaceholder')" />
          </SelectTrigger>
          <SelectContent position="item-aligned">
            <SelectItem
              v-for="category in fiteredCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.icon }} {{ category.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FieldError v-if="errors.length" :errors="errors" />
      </Field>
    </VeeField>

    <VeeField v-slot="{ field }" name="accountId">
      <CurrentAccountField class="flex-1 w-full md:w-auto" :account-id="field.value" />
    </VeeField>
    
    <Button form="add-transaction-form" type="submit" class="w-full md:ml-auto md:w-auto">
      {{ t('addTransaction.submit') }}
    </Button>
  </FieldGroup>
</template>
