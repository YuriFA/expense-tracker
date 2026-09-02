<script setup lang="ts">
import {
  ResponsiveSelect,
  ResponsiveSelectContent,
  ResponsiveSelectItem,
  ResponsiveSelectTrigger,
  ResponsiveSelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { useCategoriesIncludingArchived } from '../model/use-categories'
import { CategoryAvatar } from '@/shared/ui/category-avatar'
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

// Including archived: the trigger must still resolve the label/avatar of an
// already-assigned archived category (editing a transaction that keeps it),
// while the option list below offers only active categories (archive spec:
// pickers exclude archived, existing references keep resolving).
const { data } = useCategoriesIncludingArchived()

const filteredCategories = computed(() =>
  props.type ? data.value?.filter((category) => category.type === props.type) : data.value,
)
// Offered choices: active categories only.
const selectableCategories = computed(() =>
  filteredCategories.value?.filter((category) => category.archivedAt === null),
)
// The trigger slot must resolve the selected label itself for two reasons:
// reka's option registry is ephemeral (options unregister on unmount, so it
// is empty once the picker closes), and the trigger shows the category
// avatar, which SelectValue's text fallback cannot render.
const selectedCategory = computed(() =>
  filteredCategories.value?.find((category) => category.id === modelValue.value),
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
          <template v-if="selectedCategory">
            <CategoryAvatar
              :icon="selectedCategory.icon"
              :color="selectedCategory.color"
              class="size-5 text-xs"
            />
            {{ selectedCategory.name }}
          </template>
          <template v-else>{{ props.placeholder }}</template>
        </ResponsiveSelectValue>
      </ResponsiveSelectTrigger>
      <ResponsiveSelectContent :title="props.label">
        <ResponsiveSelectItem
          v-for="category in selectableCategories"
          :key="category.id"
          :value="category.id"
        >
          <CategoryAvatar :icon="category.icon" :color="category.color" class="size-5 text-xs" />
          {{ category.name }}
        </ResponsiveSelectItem>
      </ResponsiveSelectContent>
    </ResponsiveSelect>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
