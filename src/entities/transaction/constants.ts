import i18n from '@/app/i18n'

export const getTransactionsOptions = () => {
  const { t } = i18n.global

  return [
    { label: t('transactions.types.expense'), value: 'expense' },
    { label: t('transactions.types.income'), value: 'income' },
    { label: t('transactions.types.transfer'), value: 'transfer' },
  ]
}
