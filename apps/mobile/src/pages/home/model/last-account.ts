import { settingsStorage } from '@shared/services/storage'
import { STORAGE_KEYS } from '@shared/config/storage-keys'

/**
 * Remembers the last-used account per entry mode (cashflow / transfer) so the
 * Home form re-selects it on reopen - the "smart defaults" the design calls for
 * (section 3: "last-used account/category preselected").
 *
 * Backed by MMKV (synchronous, survives restarts), mirroring the web's
 * localStorage `last-account-ids` helper. Domain data still lives in SQLite;
 * this is just a small UX preference.
 */

interface StoredLastAccountIds {
  cashflowAccountId: string | null
  fromAccountId: string | null
  toAccountId: string | null
}

const DEFAULT: StoredLastAccountIds = {
  cashflowAccountId: null,
  fromAccountId: null,
  toAccountId: null,
}

function read(): StoredLastAccountIds {
  const stored = settingsStorage.get<StoredLastAccountIds>(STORAGE_KEYS.lastAccountIds)
  return { ...DEFAULT, ...(stored ?? {}) }
}

function write(value: StoredLastAccountIds): void {
  settingsStorage.set(STORAGE_KEYS.lastAccountIds, value)
}

export const lastAccountIds = {
  getCashflowAccountId(): string | null {
    return read().cashflowAccountId
  },
  setCashflowAccountId(accountId: string): void {
    write({ ...read(), cashflowAccountId: accountId })
  },
  getTransferAccountIds(): { fromAccountId: string | null; toAccountId: string | null } {
    const value = read()
    return { fromAccountId: value.fromAccountId, toAccountId: value.toAccountId }
  },
  setTransferAccountIds(fromAccountId: string, toAccountId: string): void {
    write({ ...read(), fromAccountId, toAccountId })
  },
}
