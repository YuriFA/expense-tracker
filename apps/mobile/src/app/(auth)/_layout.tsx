import { Stack } from 'expo-router'

/**
 * Navigator for the unauthenticated entry points (login / register / verify /
 * reset). Rendered full-screen without the bottom tabs - the mobile twin of the
 * web `meta.public` routes (apps/web/src/app/router).
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerTitleAlign: 'center' }} />
}
