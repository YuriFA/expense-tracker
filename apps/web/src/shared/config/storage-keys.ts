import { APP_NAME } from './app'

export const STORAGE_KEYS = {
  accounts: `${APP_NAME}:accounts`,
  categories: `${APP_NAME}:categories`,
  transactions: `${APP_NAME}:transactions`,
  settings: {
    locale: `${APP_NAME}:locale`,
    currency: `${APP_NAME}:currency`,
    theme: `${APP_NAME}:theme`,
  },
} as const
