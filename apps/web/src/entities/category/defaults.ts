import type { Category } from '@/types/category'
import i18n from '@/app/i18n'

const DEFAULT_CATEGORY_DEFINITIONS = [
  { id: '1', nameKey: 'seeds.categories.food', type: 'expense', icon: '🍔', color: '#FF6347' },
  {
    id: '2',
    nameKey: 'seeds.categories.transport',
    type: 'expense',
    icon: '🚗',
    color: '#1E90FF',
  },
  {
    id: '3',
    nameKey: 'seeds.categories.entertainment',
    type: 'expense',
    icon: '🎬',
    color: '#FFD700',
  },
  {
    id: '4',
    nameKey: 'seeds.categories.salary',
    type: 'income',
    icon: '💼',
    color: '#32CD32',
  },
  {
    id: '5',
    nameKey: 'seeds.categories.freelance',
    type: 'income',
    icon: '🖥️',
    color: '#8A2BE2',
  },
  {
    id: '6',
    nameKey: 'seeds.categories.health',
    type: 'expense',
    icon: '💊',
    color: '#FF69B4',
  },
  {
    id: '7',
    nameKey: 'seeds.categories.education',
    type: 'expense',
    icon: '📚',
    color: '#20B2AA',
  },
  {
    id: '8',
    nameKey: 'seeds.categories.investment',
    type: 'income',
    icon: '📈',
    color: '#FF4500',
  },
  {
    id: '9',
    nameKey: 'seeds.categories.gifts',
    type: 'income',
    icon: '🎁',
    color: '#FF1493',
  },
  {
    id: '10',
    nameKey: 'seeds.categories.utilities',
    type: 'expense',
    icon: '💡',
    color: '#00CED1',
  },
  {
    id: '11',
    nameKey: 'seeds.categories.travel',
    type: 'expense',
    icon: '✈️',
    color: '#FF8C00',
  },
  {
    id: '12',
    nameKey: 'seeds.categories.miscellaneous',
    type: 'expense',
    icon: '🛍️',
    color: '#A52A2A',
  },
  {
    id: '13',
    nameKey: 'seeds.categories.bonus',
    type: 'income',
    icon: '🎉',
    color: '#32CD32',
  },
  {
    id: '14',
    nameKey: 'seeds.categories.rent',
    type: 'expense',
    icon: '🏠',
    color: '#8B4513',
  },
  {
    id: '15',
    nameKey: 'seeds.categories.savings',
    type: 'income',
    icon: '💰',
    color: '#228B22',
  },
  {
    id: '16',
    nameKey: 'seeds.categories.charity',
    type: 'expense',
    icon: '❤️',
    color: '#FF69B4',
  },
  {
    id: '17',
    nameKey: 'seeds.categories.sideHustle',
    type: 'income',
    icon: '🛠️',
    color: '#8A2BE2',
  },
  {
    id: '18',
    nameKey: 'seeds.categories.subscriptions',
    type: 'expense',
    icon: '📱',
    color: '#1E90FF',
  },
  {
    id: '19',
    nameKey: 'seeds.categories.otherIncome',
    type: 'income',
    icon: '💵',
    color: '#32CD32',
  },
  {
    id: '20',
    nameKey: 'seeds.categories.otherExpense',
    type: 'expense',
    icon: '🛒',
    color: '#A52A2A',
  },
  {
    id: '21',
    nameKey: 'seeds.categories.healthInsurance',
    type: 'expense',
    icon: '🏥',
    color: '#FF69B4',
  },
  {
    id: '22',
    nameKey: 'seeds.categories.carMaintenance',
    type: 'expense',
    icon: '🔧',
    color: '#1E90FF',
  },
  {
    id: '23',
    nameKey: 'seeds.categories.grocery',
    type: 'expense',
    icon: '🛒',
    color: '#FF6347',
  },
  {
    id: '24',
    nameKey: 'seeds.categories.diningOut',
    type: 'expense',
    icon: '🍽️',
    color: '#FFD700',
  },
] as const satisfies ReadonlyArray<Omit<Category, 'name'> & { nameKey: string }>

export const getDefaultCategories = (): Category[] => {
  const { t } = i18n.global

  return DEFAULT_CATEGORY_DEFINITIONS.map(({ nameKey, ...category }) => ({
    ...category,
    name: t(nameKey),
  }))
}
