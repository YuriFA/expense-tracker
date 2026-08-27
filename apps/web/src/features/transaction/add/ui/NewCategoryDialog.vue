<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PlusIcon } from '@lucide/vue'
import type { Category } from '@/entities/category'
import { useCreateCategory } from '@/entities/category'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { notification } from '@/shared/services/notification'

// Inline category creation for the transaction form (mobile's
// new-category-sheet parity): the backend seeds defaults only on
// registration, so anonymous local mode starts with no categories - without
// this affordance an income/expense transaction cannot be created at all.
// User-created categories are ordinary local records: they sync as creates
// on first login, exactly like mobile.

const { type } = defineProps<{
  type: 'expense' | 'income'
}>()

const emit = defineEmits<{
  created: [category: Category]
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { mutateAsync: createCategory, asyncStatus } = useCreateCategory()
const name = ref('')

async function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return
  try {
    const category = await createCategory({
      name: trimmed,
      type,
      icon: '🏷️',
      color: '#94a3b8',
    })
    notification.success(t('addTransaction.categoryCreated'))
    emit('created', category)
    name.value = ''
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
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm" data-testid="new-category-dialog">
      <DialogHeader>
        <DialogTitle>{{ t('addTransaction.newCategory') }}</DialogTitle>
      </DialogHeader>
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
        <DialogFooter>
          <Button type="submit" :loading="asyncStatus === 'loading'" :disabled="!name.trim()">
            <PlusIcon class="size-4" />
            {{ t('actions.create') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
