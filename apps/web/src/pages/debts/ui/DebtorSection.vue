<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from '@lucide/vue'
import type { Debtor } from '@expense-tracker/api'
import type { DebtDirection, DebtOperation } from '@/entities/debt-operation'
import { debtorSection } from '../model/selectors'
import DebtorRow from './DebtorRow.vue'
import { Button } from '@/shared/ui/button'

// One direction's section: header with the combined contact+debt add action,
// visible debtor rows, and settled (zero-balance) debtors behind a reveal.

const props = defineProps<{
  direction: DebtDirection
  debtors: readonly Debtor[]
  operations: readonly DebtOperation[]
}>()

const emit = defineEmits<{
  add: [direction: DebtDirection]
  select: [debtor: Debtor, direction: DebtDirection]
}>()

const { t } = useI18n()

const section = computed(() => debtorSection(props.debtors, props.operations, props.direction))

const title = computed(() =>
  props.direction === 'receivable' ? t('debts.receivable') : t('debts.payable'),
)
const addTitle = computed(() =>
  props.direction === 'receivable' ? t('debts.receivableAddTitle') : t('debts.payableAddTitle'),
)
const emptyText = computed(() =>
  props.direction === 'receivable' ? t('debts.receivableEmpty') : t('debts.payableEmpty'),
)

const showSettled = ref(false)
</script>

<template>
  <section>
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-muted-foreground">{{ title }}</h2>
      <Button
        variant="ghost"
        size="icon"
        class="size-7 rounded-full"
        :aria-label="addTitle"
        :data-testid="`debts-section-add-${direction}`"
        @click="emit('add', direction)"
      >
        <Plus class="size-4" />
      </Button>
    </div>

    <div class="mt-1">
      <p v-if="section.visible.length === 0 && section.settled.length === 0" class="py-2 text-sm text-muted-foreground">
        {{ emptyText }}
      </p>
      <DebtorRow
        v-for="view in section.visible"
        :key="view.debtor.id"
        :debtor="view.debtor"
        :balance="view.balance"
        @click="emit('select', view.debtor, direction)"
      />
      <button
        v-if="section.settled.length > 0"
        type="button"
        class="px-2 py-1 text-xs text-muted-foreground hover:underline"
        :data-testid="`debts-settled-reveal-${direction}`"
        @click="showSettled = !showSettled"
      >
        {{
          showSettled
            ? t('debts.hideSettled')
            : t('debts.showSettled', { count: section.settled.length })
        }}
      </button>
      <template v-if="showSettled">
        <DebtorRow
          v-for="view in section.settled"
          :key="view.debtor.id"
          :debtor="view.debtor"
          :balance="view.balance"
          @click="emit('select', view.debtor, direction)"
        />
      </template>
    </div>
  </section>
</template>
