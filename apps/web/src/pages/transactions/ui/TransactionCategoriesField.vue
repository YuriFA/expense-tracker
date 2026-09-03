<script setup lang="ts">
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Skeleton } from '@/shared/ui/skeleton'
import { CategoryAvatar } from '@/shared/ui/category-avatar'
import { useCategoriesIncludingArchived } from '@/entities/category'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  errors?: string[]
  type?: 'expense' | 'income' | 'transfer' | 'adjustment'
  class?: string
}>()

const modelValue = defineModel<string[] | undefined>()

const { t } = useI18n()
// Including archived: this is a join over existing records -
// archived categories stay visible in history/analytics/filters.
const { data: categories, error, isPending } = useCategoriesIncludingArchived()

const filteredCategories = computed(() => {
  if (props.type === undefined || props.type === 'adjustment') {
    // Adjustments carry no category: with the adjustment type filter set the
    // category list is irrelevant (any category selection excludes them).
    return props.type === 'adjustment' ? [] : categories.value
  }
  return categories.value?.filter((category) => category.type === props.type)
})

/** Toggles one category id inside the committed-on-apply form value. */
const toggle = (categoryId: string, included: boolean) => {
  const current = modelValue.value ?? []
  const next = included ? [...current, categoryId] : current.filter((id) => id !== categoryId)
  modelValue.value = next.length > 0 ? next : undefined
}
</script>

<template>
  <!-- Drawer specimen: multi-select category rows with the avatar identity,
       label left / 20px filter-checkbox right. -->
  <Field :class="props.class" orientation="responsive" :data-invalid="!!props.errors?.length">
    <FieldLabel class="text-xs font-bold uppercase tracking-wider" for="category-id">
      {{ t('transactions.filters.categoryLabel') }}
    </FieldLabel>
    <div class="flex flex-col gap-3" data-testid="transactions-filter-categories">
      <template v-if="isPending">
        <Skeleton v-for="n in 2" :key="n" class="h-5 w-32" />
      </template>
      <div v-else-if="error" class="text-sm text-muted-foreground">
        {{ t('common.errorState.title') }}
      </div>
      <label
        v-for="category in filteredCategories"
        v-else
        :key="category.id"
        class="flex cursor-pointer items-center justify-between gap-3"
      >
        <span class="flex min-w-0 items-center gap-2 text-sm">
          <CategoryAvatar :icon="category.icon" :color="category.color" class="size-5 text-xs" />
          <span class="truncate">{{ category.name }}</span>
        </span>
        <Checkbox
          variant="filter"
          :model-value="modelValue?.includes(category.id) ?? false"
          :aria-label="category.name"
          :data-testid="`transactions-filter-category-${category.id}`"
          @update:model-value="(checked) => toggle(category.id, !!checked)"
        />
      </label>
    </div>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
