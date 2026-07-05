import i18n from '@/shared/i18n'
import type { Category } from './types'

export const getCategoryNameBySlug = (slug: string): string => {
  const { t } = i18n.global

  switch (slug) {
    case 'food':
      return t('seeds.categories.food')
    case 'transport':
      return t('seeds.categories.transport')
    case 'entertainment':
      return t('seeds.categories.entertainment')
    case 'salary':
      return t('seeds.categories.salary')
    case 'freelance':
      return t('seeds.categories.freelance')
    case 'health':
      return t('seeds.categories.health')
    case 'education':
      return t('seeds.categories.education')
    case 'investment':
      return t('seeds.categories.investment')
    case 'gifts':
      return t('seeds.categories.gifts')
    case 'utilities':
      return t('seeds.categories.utilities')
    case 'travel':
      return t('seeds.categories.travel')
    case 'miscellaneous':
      return t('seeds.categories.miscellaneous')
    case 'bonus':
      return t('seeds.categories.bonus')
    case 'rent':
      return t('seeds.categories.rent')
    case 'savings':
      return t('seeds.categories.savings')
    case 'charity':
      return t('seeds.categories.charity')
    case 'side-hustle':
      return t('seeds.categories.sideHustle')
    case 'subscriptions':
      return t('seeds.categories.subscriptions')
    case 'other-income':
      return t('seeds.categories.otherIncome')
    case 'other-expense':
      return t('seeds.categories.otherExpense')
    case 'health-insurance':
      return t('seeds.categories.healthInsurance')
    case 'car-maintenance':
      return t('seeds.categories.carMaintenance')
    case 'grocery':
      return t('seeds.categories.grocery')
    case 'dining-out':
      return t('seeds.categories.diningOut')
    default:
      return slug
  }
}

export const mapCategory = (category: Category): Category => {
  return {
    ...category,
    name: getCategoryNameBySlug(category.slug) || category.name,
  }
}

export const mapCategories = (categories: Category[]): Category[] => {
  return categories.map(mapCategory)
}
