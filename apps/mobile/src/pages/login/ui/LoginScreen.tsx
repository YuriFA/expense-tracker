import { useState } from 'react'
import { Screen, Text, Stack, Input, Button } from '@/shared'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Screen testID="screen-login">
      <Stack gap="lg" className="p-6 justify-center">
        {/* Header */}
        <Stack gap="sm">
          <Text variant="h1">Welcome back</Text>
          <Text variant="body" className="text-muted-foreground">
            Sign in to your account
          </Text>
        </Stack>

        {/* Form */}
        <Stack gap="md">
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            leadingIcon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            leadingIcon="lock-closed"
            secureTextEntry
          />

          <Button variant="primary" text="Sign In" onPress={handleLogin} loading={isLoading} />
        </Stack>

        {/* Divider with "or" */}
        <Stack gap="md" className="items-center">
          <Stack className="flex-row items-center gap-4 w-full">
            <Stack className="flex-1 h-px bg-border" />
            <Text variant="caption" className="text-muted-foreground">
              or continue with
            </Text>
            <Stack className="flex-1 h-px bg-border" />
          </Stack>

          <Stack className="flex-row gap-4">
            <Button variant="outline" text="Google" />
            <Button variant="outline" text="Apple" />
          </Stack>
        </Stack>

        {/* Sign up link */}
        <Stack className="flex-row items-center gap-2 self-center">
          <Text variant="body-sm" className="text-muted-foreground">
            Don't have an account?
          </Text>
          <Button variant="ghost" text="Sign up" size="sm" />
        </Stack>
      </Stack>
    </Screen>
  )
}
