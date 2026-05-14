import 'vue-i18n'

import type { MessageSchema } from '@/app/i18n/schema'

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}
