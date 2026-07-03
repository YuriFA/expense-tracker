<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError } from '@/shared/ui/field'
import { useAccounts } from '@/entities/account/use-accounts'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue?: string
  errors?: string[]
  excludeId?: string
  class?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
const { data } = useAccounts()

const filteredAccounts = computed(() =>
  props.excludeId ? data.value?.filter((account) => account.id !== props.excludeId) : data.value,
)
</script>

<template>
  <Field :class="props.class" orientation="responsive" :data-invalid="!!props.errors?.length">
    <Select
      :model-value="props.modelValue"
      @update:model-value="(v) => $emit('update:modelValue', v as string)"
    >
      <SelectTrigger id="from-account-id" :aria-invalid="!!props.errors?.length" class="w-full! min-w-0">
        <SelectValue :placeholder="t('addTransfer.fromAccountPlaceholder')" />
      </SelectTrigger>
      <SelectContent position="item-aligned">
        <SelectItem v-for="item in filteredAccounts" :key="item.id" :value="item.id">
          {{ item.name }}
        </SelectItem>
      </SelectContent>
    </Select>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
