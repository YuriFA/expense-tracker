import 'vue-i18n'

import type { MessageSchema } from '@expense-tracker/i18n'

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends MessageSchema {}
}
