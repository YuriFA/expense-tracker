<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
</script>

<template>
  <Field :class="props.class" orientation="responsive" :data-invalid="!!props.errors?.length">
    <FieldLabel :for="props.inputId">{{ props.label }}</FieldLabel>
    <Select v-model="modelValue">
      <SelectTrigger :id="props.inputId" :aria-invalid="!!props.errors?.length" class="w-full! min-w-0">
        <SelectValue :placeholder="props.placeholder" />
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
