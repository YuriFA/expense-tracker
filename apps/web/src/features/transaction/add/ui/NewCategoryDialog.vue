<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PlusIcon } from '@lucide/vue'
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  pickCategoryColor,
  type Category,
} from '@/entities/category'
import { useCategoriesIncludingArchived, useCreateCategory } from '@/entities/category'
import { Button } from '@/shared/ui/button'
import { ResponsiveDialog } from '@/shared/ui/responsive-dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { notification } from '@/shared/services/notification'

// Inline category creation for the transaction form (mobile's
// new-category-sheet parity): the backend seeds defaults only on
// registration, so anonymous local mode starts with no categories - without
// this affordance an income/expense transaction cannot be created at all.
// User-created categories are ordinary local records: they sync as creates
// on first login, exactly like mobile. Icon and color are a pre-paired set
// (category-appearance config): the user picks only the emoji, the color is
// assigned automatically and stored on the record.

const { type } = defineProps<{
  type: 'expense' | 'income'
}>()

const emit = defineEmits<{
  created: [category: Category]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { mutateAsync: createCategory, asyncStatus } = useCreateCategory()
// Including archived: archived categories still render in charts, so their
// colors count as taken for the distinct-palette walk.
const { data: categories } = useCategoriesIncludingArchived()
const name = ref('')
const icon = ref<string>(DEFAULT_CATEGORY_ICON.icon)

async function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  try {
    const category = await createCategory({
      name: trimmed,
      type,
      icon: icon.value,
      color: pickCategoryColor(
        icon.value,
        categories.value?.map((existing) => existing.color) ?? [],
      ),
    })
    notification.success(t('addTransaction.categoryCreated'))
    emit('created', category)
    name.value = ''
    icon.value = DEFAULT_CATEGORY_ICON.icon
    open.value = false
  } catch (error) {
    notification.mutationError(error, {
      title: t('addTransaction.newCategory'),
      feature: 'category',
      action: 'create',
    })
  }
}
</script>

<template>
  <ResponsiveDialog v-model:open="open" class="sm:max-w-sm" data-testid="new-category-dialog">
    <template #title>{{ t('addTransaction.newCategory') }}</template>

    <form id="new-category-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <Field>
        <FieldLabel for="new-category-name">{{ t('addTransaction.categoryName') }}</FieldLabel>
        <Input
          id="new-category-name"
          v-model="name"
          data-testid="new-category-name"
          :placeholder="t('addTransaction.categoryName')"
        />
      </Field>
      <Field>
        <FieldLabel>{{ t('addTransaction.categoryIcon') }}</FieldLabel>
        <!-- Picker tiles are live previews: each emoji on the pastel tint
             of its own paired color (design-system identity rule). -->
        <div
          class="flex flex-wrap gap-2"
          role="radiogroup"
          :aria-label="t('addTransaction.categoryIcon')"
        >
          <button
            v-for="(option, index) in CATEGORY_ICONS"
            :key="option.icon"
            type="button"
            role="radio"
            :aria-checked="icon === option.icon"
            :data-testid="`new-category-icon-${index}`"
            class="flex size-10 items-center justify-center rounded-full text-lg transition-shadow"
            :class="
              icon === option.icon ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
            "
            :style="{ backgroundColor: `color-mix(in srgb, ${option.color} 15%, transparent)` }"
            @click="icon = option.icon"
          >
            {{ option.icon }}
          </button>
        </div>
      </Field>
    </form>

    <template #footer>
      <Button
        type="submit"
        form="new-category-form"
        :loading="asyncStatus === 'loading'"
        :disabled="!name.trim()"
      >
        <PlusIcon class="size-4" />
        {{ t('actions.create') }}
      </Button>
    </template>
  </ResponsiveDialog>
</template>
