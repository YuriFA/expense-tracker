// Resolves the dev-client deep link the flows open: it tells the installed
// dev build (appId com.anonymous.mobile) to load the JS bundle from the
// running Metro dev server.
//
// Maestro only auto-captures shell environment variables prefixed with
// `MAESTRO_`, so the target is overridable without editing any file (e.g. a
// non-standard Metro port):
//
//   MAESTRO_EXPO_URL='com.anonymous.mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082' \
//     maestro test .maestro
//
// Defaults to the standard Metro port (8081). See apps/mobile/AGENTS.md
// "E2E / Maestro" for the full run recipe.
output.url =
  MAESTRO_EXPO_URL || 'com.anonymous.mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'

// Credentials for the sync flow (09). Provision the default user once when a
// fresh backend is running:
//   curl -X POST :8080/api/auth/register -H 'Content-Type: application/json' \
//     -d '{"email":"maestro-sync@example.com","password":"maestro-password-1"}'
output.testEmail = MAESTRO_TEST_EMAIL || 'maestro-sync@example.com'
output.testPassword = MAESTRO_TEST_PASSWORD || 'maestro-password-1'
