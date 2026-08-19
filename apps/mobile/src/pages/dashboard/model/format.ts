// Thin re-export: the formatting helpers moved to shared/lib (they are now
// consumed by the transactions tab as well); dashboard imports keep working.
export {
  formatAmount,
  monthRangeLabel,
  monthRangeLabelShort,
  relativeDayLabel,
} from '@/shared/lib/format/format'
