export interface ErrorContext {
  feature?: string // 'accounts' | 'transactions' | 'categories' ...
  action?: string // 'create' | 'update' | 'delete' | 'transfer' ...
}

export interface MutationErrorOptions extends ErrorContext {
  title: string // уже переведённая строка (caller явно вызывает t('addAccount.error'))
}
