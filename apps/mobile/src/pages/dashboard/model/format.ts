// Thin re-export: date labels live in @expense-tracker/dates and money
// formatting in shared/lib/format; dashboard imports keep working.
export { formatAmount } from '@/shared/lib/format/format'
export { monthRangeLabel, monthRangeLabelShort, relativeDayLabel } from '@expense-tracker/dates'
