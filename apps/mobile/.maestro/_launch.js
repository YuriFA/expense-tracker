// Resolves the Expo Go dev-server URL the flows deep-link into.
//
// Maestro only auto-captures shell environment variables prefixed with
// `MAESTRO_`, so the dev-server URL is overridable without editing any file:
//
//   MAESTRO_EXPO_URL='exp://127.0.0.1:<port>' maestro test .maestro
//
// Defaults to the standard Metro port (8081). See apps/mobile/AGENTS.md
// "Testing / e2e" for the full run recipe.
output.url = MAESTRO_EXPO_URL || 'exp://127.0.0.1:8081'

// Credentials for the sync flow (09). Provision the default user once when a
// fresh backend is running:
//   curl -X POST :8080/api/auth/register -H 'Content-Type: application/json' \
//     -d '{"email":"maestro-sync@example.com","password":"maestro-password-1"}'
output.testEmail = MAESTRO_TEST_EMAIL || 'maestro-sync@example.com'
output.testPassword = MAESTRO_TEST_PASSWORD || 'maestro-password-1'
