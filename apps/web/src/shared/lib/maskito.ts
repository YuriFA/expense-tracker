import { maskitoNumberOptionsGenerator } from '@maskito/kit'

export const moneyMaskitoOptions = maskitoNumberOptionsGenerator({
  min: 0,
  maximumFractionDigits: 2,
})

export const createMoneyMaskitoOptions = (currencySymbol: string) =>
  maskitoNumberOptionsGenerator({
    maximumFractionDigits: 2,
    prefix: currencySymbol,
  })
