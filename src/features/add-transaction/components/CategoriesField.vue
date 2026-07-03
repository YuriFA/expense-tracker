<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { useCategories } from '@/entities/category/use-categories'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  errors?: string[]
  type?: 'expense' | 'income'
  class?: string
}>()

const modelValue = defineModel<string | undefined>()

const { t } = useI18n()
const { data } = useCategories()

const filteredCategories = computed(() =>
  props.type ? data.value?.filter((category) => category.type === props.type) : data.value,
)
</script>

<template>
  <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!props.errors?.length">
    <FieldLabel for="category-id">{{ t('addTransaction.categoryLabel') }}</FieldLabel>
    <Select v-model="modelValue">
      <SelectTrigger
        id="category-id"
        :aria-invalid="!!props.errors?.length"
        class="w-full! min-w-0 md:min-w-36"
      >
        <SelectValue :placeholder="t('addTransaction.categoryPlaceholder')" />
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
