import { Text, Screen, Input, Button } from '@/shared/ui'
import { useState } from 'react'
import { View } from 'react-native'

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
      <View className="gap-6 p-6 justify-center">
        {/* Header */}
        <View className="gap-2">
          <Text variant="h1">Welcome back</Text>
          <Text variant="body" className="text-muted-foreground">
            Sign in to your account
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
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
        </View>

        {/* Divider with "or" */}
        <View className="gap-4 items-center">
          <View className="flex-row items-center gap-4 w-full">
            <View className="flex-1 h-px bg-border" />
            <Text variant="caption" className="text-muted-foreground">
              or continue with
            </Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <View className="flex-row gap-4">
            <Button variant="outline" text="Google" />
            <Button variant="outline" text="Apple" />
          </View>
        </View>

        {/* Sign up link */}
        <View className="flex-row items-center gap-2 self-center">
          <Text variant="body-sm" className="text-muted-foreground">
            Don't have an account?
          </Text>
          <Button variant="ghost" text="Sign up" size="sm" />
        </View>
      </View>
    </Screen>
  )
}
