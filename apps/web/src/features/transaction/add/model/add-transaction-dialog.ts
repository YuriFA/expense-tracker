import { ref } from 'vue'

// The desktop creation flow is ONE dialog (web-unified-transaction-entry):
// every trigger - sidebar CTA, «N» hotkey, command palette, transactions-page
// button - calls open() here instead of hosting its own Dialog. The host
// component (AddTransactionDialogHost) is mounted once in the app shell.
export type AddTransactionType = 'expense' | 'income' | 'transfer'

const open = ref(false)
const preselect = ref<AddTransactionType>('expense')

export function useAddTransactionDialog() {
  function openAddTransactionDialog(type: AddTransactionType = 'expense') {
    preselect.value = type
    open.value = true
  }

  function closeAddTransactionDialog() {
    open.value = false
  }

  return { open, preselect, openAddTransactionDialog, closeAddTransactionDialog }
}
