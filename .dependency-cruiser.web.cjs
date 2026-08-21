/**
 * Architecture rules for apps/web/src — invariant #14 (apps never import
 * date-fns directly). Web FSD layering (#15) is enforced separately by
 * Steiger in the web `lint` script; only the facade rule is mirrored here
 * so it runs in CI via `pnpm arch:check`.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-date-fns',
      comment: 'invariant #14: apps never import date-fns directly (facade rule)',
      severity: 'error',
      from: { path: '^apps/web/src/' },
      to: { path: '^date-fns' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
  },
}
