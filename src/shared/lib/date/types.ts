type Brand<TValue, TName extends string> = TValue & { readonly __brand: TName }

export type CalendarDay = string

export type IsoDateTime = string

export type BrandedCalendarDay = Brand<string, 'CalendarDay'>

export type BrandedIsoDateTime = Brand<string, 'IsoDateTime'>
