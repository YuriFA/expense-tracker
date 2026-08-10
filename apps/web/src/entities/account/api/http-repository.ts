import { createHTTPAccountRepository as createHTTPAccountRepositoryBase } from '@expense-tracker/api'
import { apiClient } from '@/shared/api'

// Bind the web API client (configured with the Vite dev proxy base URL) to the
// shared HTTP repository implementation.
export const createHTTPAccountRepository = () => createHTTPAccountRepositoryBase(apiClient)
