// «Без счета» sentinel for cashflow forms and filters. The form field holds
// this constant instead of a real account id; the submit seam converts it to
// `accountId: null` exactly once (the domain type is `string | null`).
export const NO_ACCOUNT_ID = '__no_account__'

export const isNoAccount = (value: string | null | undefined): value is typeof NO_ACCOUNT_ID =>
  value === NO_ACCOUNT_ID
