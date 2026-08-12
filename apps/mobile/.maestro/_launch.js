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
