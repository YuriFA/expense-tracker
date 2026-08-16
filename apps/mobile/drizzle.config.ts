import type { Config } from 'drizzle-kit'

export default {
  dialect: 'sqlite',
  schema: './src/shared/lib/db/schema.ts',
  out: './drizzle',
} satisfies Config
