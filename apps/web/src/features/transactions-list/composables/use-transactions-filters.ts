import { computed } from 'vue'
import { useRouteQuery } from '@vueuse/router'
import { currentDay, parseCalendarDate, startOfMonth, type DateValue } from '@/shared/lib/date'

export function useTransactionsFilters() {
  const fromQuery = useRouteQuery('from', currentDay().subtract({ days: 6 }).toString())
  const toQuery = useRouteQuery('to', currentDay().toString())

  const fromDate = computed({
    get: () => parseCalendarDate(fromQuery.value),
    set: (value: DateValue) => {
      fromQuery.value = value.toString()
    },
  })
  const toDate = computed({
    get: () => parseCalendarDate(toQuery.value),
    set: (value: DateValue) => {
      toQuery.value = value.toString()
    },
  })

  const setRange = (from: DateValue, to: DateValue) => {
    fromDate.value = from
    toDate.value = to
  }

  const setToday = () => {
    const now = currentDay()
    setRange(now, now)
  }
  const setLast7Days = () => {
    const now = currentDay()
    setRange(now.subtract({ days: 6 }), now)
  }
  const setLast30Days = () => {
    const now = currentDay()
    setRange(now.subtract({ days: 29 }), now)
  }
  const setThisMonth = () => {
    const now = currentDay()
    setRange(startOfMonth(now), now)
  }

  return {
    fromQuery,
    toQuery,
    fromDate,
    toDate,
    setRange,
    setToday,
    setLast7Days,
    setLast30Days,
    setThisMonth,
  }
}
