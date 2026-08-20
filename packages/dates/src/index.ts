// Date display and calendar logic shared across apps on top of date-fns:
// locale-shaped labels (ru/en), month-cursor navigation, Monday-first month
// grids, and stable day keys. Pure functions over the native Date - no DOM or
// React Native APIs (see the root AGENTS.md package rules). Web's richer
// @internationalized/date adapter stays app-local for now; its pure string
// layer may migrate onto this package later.

export {
  calendarDaysAgo,
  dateTimeLabel,
  fullDayLabel,
  monthRangeLabel,
  monthRangeLabelShort,
  relativeDayLabel,
  shortDayLabel,
  todayLabel,
  yesterdayLabel,
  type DateLabelOptions,
} from './labels'
export {
  currentMonth,
  isCurrentOrFutureMonth,
  monthLabel,
  monthToUtcDayRange,
  nextMonth,
  previousMonth,
  transactionsInMonth,
  type MonthCursor,
} from './month'
export { monthGrid, weekdayLabels } from './grid'
export { calendarDayKey, isoDaysAgo, nowIso } from './keys'
