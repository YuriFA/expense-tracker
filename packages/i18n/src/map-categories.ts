/**
 * Minimal category shape the localization helpers need. Generic so this package
 * has no dependency on the domain package: any concrete category type (web's
 * `Category`, mobile's equivalent) that carries an optional `slug` works.
 */
export interface LocalizableCategory {
  id: string
  name: string
  slug?: string
}

/**
 * Translator function: resolves a dotted message key (e.g.
 * `seeds.categories.food`) to a localized string. Apps pass their i18n lib's
 * `t` (vue-i18n on web, react-i18next on mobile), keeping this package
 * framework-agnostic.
 */
export type Translator = (key: string) => string

const SEED_KEY_BY_SLUG: Readonly<Record<string, string>> = {
  food: 'seeds.categories.food',
  transport: 'seeds.categories.transport',
  entertainment: 'seeds.categories.entertainment',
  salary: 'seeds.categories.salary',
  freelance: 'seeds.categories.freelance',
  health: 'seeds.categories.health',
  education: 'seeds.categories.education',
  investment: 'seeds.categories.investment',
  gifts: 'seeds.categories.gifts',
  utilities: 'seeds.categories.utilities',
  travel: 'seeds.categories.travel',
  miscellaneous: 'seeds.categories.miscellaneous',
  bonus: 'seeds.categories.bonus',
  rent: 'seeds.categories.rent',
  savings: 'seeds.categories.savings',
  charity: 'seeds.categories.charity',
  'side-hustle': 'seeds.categories.sideHustle',
  subscriptions: 'seeds.categories.subscriptions',
  'other-income': 'seeds.categories.otherIncome',
  'other-expense': 'seeds.categories.otherExpense',
  'health-insurance': 'seeds.categories.healthInsurance',
  'car-maintenance': 'seeds.categories.carMaintenance',
  grocery: 'seeds.categories.grocery',
  'dining-out': 'seeds.categories.diningOut',
}

/** Returns the localized name for a default-category slug, falling back to the slug. */
export function localizeCategoryName(slug: string, t: Translator): string {
  const key = SEED_KEY_BY_SLUG[slug]
  return key ? t(key) : slug
}

/** Returns a copy of the category with its name localized when it has a seed slug. */
export function mapCategory<C extends LocalizableCategory>(category: C, t: Translator): C {
  const localizedName = category.slug ? localizeCategoryName(category.slug, t) : ''

  return {
    ...category,
    name: localizedName || category.name,
  }
}

/** Localizes a list of categories (default seed) in place order. */
export function mapCategories<C extends LocalizableCategory>(
  categories: C[],
  t: Translator,
): C[] {
  return categories.map((category) => mapCategory(category, t))
}
