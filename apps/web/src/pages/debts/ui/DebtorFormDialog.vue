<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm, Field as VeeField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import type { Debtor } from '@/entities/debtor'
import { useDeleteDebtor, useUpdateDebtor } from '@/entities/debtor'
import { createDebtorSchema, type DebtorFormValues } from '../model/schemas'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Trash2 } from '@lucide/vue'
import { notification } from '@/shared/services/notification'

// Edit a contact (debtor). The update payload always carries the full note
// state: empty string clears, untouched re-sends the same value (note
// semantics of the debts capability).

const props = defineProps<{
  debtor: Debtor
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  deleted: []
}>()

const { t } = useI18n()
const { mutateAsync: updateDebtor } = useUpdateDebtor()
const { mutateAsync: deleteDebtor } = useDeleteDebtor()

const { handleSubmit: handleFormSubmit, isSubmitting } = useForm<DebtorFormValues>({
  validationSchema: toTypedSchema(createDebtorSchema()),
  initialValues: {
    name: props.debtor.name,
    note: props.debtor.note,
  },
})

const handleSubmit = handleFormSubmit(async (data) => {
  try {
    await updateDebtor({
      id: props.debtor.id,
      payload: { name: data.name.trim(), note: data.note, version: props.debtor.version },
    })
    notification.success(t('debts.contactUpdated'))
    open.value = false
  } catch (error) {
    notification.mutationError(error, {
      title: t('debts.error'),
      feature: 'debtor',
      action: 'update',
    })
  }
})

const deleteOpen = ref(false)
const isDeleting = ref(false)

const handleDelete = async () => {
  isDeleting.value = true
  try {
    await deleteDebtor(props.debtor.id)
    notification.success(t('debts.contactDeleted'))
    emit('deleted')
    open.value = false
  } catch (error) {
    // Debtor-in-use (live operations) surfaces here as a typed error.
    notification.mutationError(error, {
      title: t('debts.error'),
      feature: 'debtor',
      action: 'delete',
    })
  } finally {
    isDeleting.value = false
    deleteOpen.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm" data-testid="debts-debtor-dialog">
      <DialogHeader class="flex-row items-center justify-between space-y-0">
        <DialogTitle>{{ t('debts.contact') }}</DialogTitle>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="t('debts.deleteContact')"
          data-testid="debts-debtor-delete"
          @click="deleteOpen = true"
        >
          <Trash2 class="size-4" />
        </Button>
      </DialogHeader>

      <form class="flex flex-col gap-3" @submit="handleSubmit">
        <VeeField v-slot="{ value, setValue, errors }" name="name">
          <Field :data-invalid="!!errors.length">
            <FieldLabel for="debts-debtor-name">{{ t('fields.name') }}</FieldLabel>
            <Input
              id="debts-debtor-name"
              type="text"
              :placeholder="t('debts.namePlaceholder')"
              :model-value="value"
              :aria-invalid="!!errors.length"
              @update:model-value="setValue"
            />
            <FieldError v-if="errors.length" :errors="errors" />
          </Field>
        </VeeField>

        <VeeField v-slot="{ value, setValue }" name="note">
          <Field>
            <FieldLabel for="debts-debtor-note">{{ t('fields.description') }}</FieldLabel>
            <Input
              id="debts-debtor-note"
              type="text"
              :placeholder="t('debts.noteOptionalPlaceholder')"
              :model-value="value"
              @update:model-value="setValue"
            />
          </Field>
        </VeeField>

        <DialogFooter class="flex-row">
          <Button type="submit" class="flex-1" :loading="isSubmitting" data-testid="debts-debtor-submit">
            {{ t('debts.save') }}
          </Button>
        </DialogFooter>
      </form>

      <AlertDialog v-model:open="deleteOpen">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t('debts.deleteContactTitle') }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ t('deleteTransaction.confirmDeleteDescription') }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ t('debts.cancel') }}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" :loading="isDeleting" @click="handleDelete">
              {{ t('debts.delete') }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>
</template>
