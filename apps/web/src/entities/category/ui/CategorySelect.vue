<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { useCategories } from '../model/use-categories'
import { computed } from 'vue'

const props = defineProps<{
  label: string
  placeholder: string
  inputId: string
  type?: 'expense' | 'income'
  errors?: string[]
  class?: string
}>()

const modelValue = defineModel<string | undefined>()

const { data } = useCategories()

const filteredCategories = computed(() =>
  props.type ? data.value?.filter((category) => category.type === props.type) : data.value,
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
        <SelectItem v-for="category in filteredCategories" :key="category.id" :value="category.id">
          {{ category.icon }} {{ category.name }}
        </SelectItem>
      </SelectContent>
    </Select>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
