<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Skeleton } from '@/shared/ui/skeleton'
import { CategoryAvatar, useCategories } from '@/entities/category'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  errors?: string[]
  type?: 'expense' | 'income' | 'transfer'
  class?: string
}>()

const modelValue = defineModel<string | undefined>()

const { t } = useI18n()
const { data: categories, error, isLoading } = useCategories()

const filteredCategories = computed(() => {
  if (props.type === undefined) {
    return categories.value
  }
  return categories.value?.filter((category) => category.type === props.type)
})
</script>

<template>
  <Field class="w-full md:w-auto" orientation="responsive" :data-invalid="!!props.errors?.length">
    <FieldLabel for="category-id">{{ t('transactions.filters.categoryLabel') }}</FieldLabel>
    <Select v-model="modelValue">
      <SelectTrigger
        id="category-id"
        :aria-invalid="!!props.errors?.length"
        class="w-full! min-w-0 md:min-w-36"
      >
        <SelectValue :placeholder="t('transactions.filters.categoryPlaceholder')" />
      </SelectTrigger>
      <SelectContent position="item-aligned">
        <template v-if="isLoading">
          <div v-for="n in 3" :key="n" class="px-8 py-2">
            <Skeleton class="h-4 w-full" />
          </div>
        </template>
        <div v-else-if="error" class="px-8 py-2 text-sm text-muted-foreground">
          {{ t('common.errorState.title') }}
        </div>
        <SelectItem
          v-for="category in filteredCategories"
          v-else
          :key="category.id"
          :value="category.id"
        >
          <span>
            <CategoryAvatar :icon="category.icon" :color="category.color" class="size-5 text-xs" />
            {{ category.name }}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
