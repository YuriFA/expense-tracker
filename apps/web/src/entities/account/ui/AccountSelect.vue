<script setup lang="ts">
import {
  ResponsiveSelect,
  ResponsiveSelectContent,
  ResponsiveSelectItem,
  ResponsiveSelectTrigger,
  ResponsiveSelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { useAccounts } from '../model/use-accounts'
import { computed } from 'vue'

const props = defineProps<{
  label: string
  placeholder: string
  inputId: string
  errors?: string[]
  excludeId?: string
  class?: string
}>()

const modelValue = defineModel<string | undefined>()

const { data } = useAccounts()

const filteredAccounts = computed(() =>
  props.excludeId ? data.value?.filter((account) => account.id !== props.excludeId) : data.value,
)
// The trigger slot must resolve the selected label itself: reka's option
// registry is ephemeral (options unregister on unmount, so it is empty once
// the picker closes), which is exactly when the trigger still has to show
// the value. Same constraint as CategorySelect.
const selectedAccount = computed(() =>
  filteredAccounts.value?.find((account) => account.id === modelValue.value),
)
</script>

<template>
  <Field :class="props.class" orientation="responsive" :data-invalid="!!props.errors?.length">
    <FieldLabel :for="props.inputId">{{ props.label }}</FieldLabel>
    <ResponsiveSelect v-model="modelValue">
      <ResponsiveSelectTrigger
        :id="props.inputId"
        :aria-invalid="!!props.errors?.length"
        class="w-full! min-w-0"
      >
        <ResponsiveSelectValue :placeholder="props.placeholder">
          {{ selectedAccount?.name ?? props.placeholder }}
        </ResponsiveSelectValue>
      </ResponsiveSelectTrigger>
      <ResponsiveSelectContent :title="props.label">
        <ResponsiveSelectItem v-for="item in filteredAccounts" :key="item.id" :value="item.id">
          {{ item.name }}
        </ResponsiveSelectItem>
      </ResponsiveSelectContent>
    </ResponsiveSelect>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
