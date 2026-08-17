import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/shared/ui/button'
import { FormField, FormLabel } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { Screen } from '@/shared/ui/screen'
import { Text } from '@/shared/ui/text'
import { useAuth } from '@/entities/session'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Введите email и пароль')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await login(email.trim(), password)
      if (result.ok) router.back()
      // A cancelled ownership takeover stays on this screen by design.
    } catch (cause) {
      setError(getRepositoryErrorText(cause))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Screen testID="screen-login">
      <View className="gap-6 p-6 justify-center">
        <View className="gap-2">
          <Text variant="h1">С возвращением</Text>
          <Text variant="body" className="text-muted-foreground">
            Войдите, чтобы синхронизировать данные
          </Text>
        </View>

        <View className="gap-4">
          <FormField>
            <FormLabel>Email</FormLabel>
            <Input
              placeholder="Введите email"
              value={email}
              onChangeText={setEmail}
              leadingIcon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
              testID="login-email-input"
            />
          </FormField>

          <FormField>
            <FormLabel>Пароль</FormLabel>
            <Input
              placeholder="Введите пароль"
              value={password}
              onChangeText={setPassword}
              leadingIcon="lock-closed"
              secureTextEntry
              testID="login-password-input"
            />
          </FormField>

          {error ? (
            <Text variant="body-sm" className="text-destructive" testID="login-error-text">
              {error}
            </Text>
          ) : null}

          <Button
            variant="primary"
            text="Войти"
            onPress={handleLogin}
            loading={isLoading}
            testID="login-submit-button"
          />
        </View>

        <View className="flex-row items-center gap-2 self-center">
          <Text variant="body-sm" className="text-muted-foreground">
            Нет аккаунта?
          </Text>
          <Button
            variant="ghost"
            text="Зарегистрироваться"
            size="sm"
            onPress={() => router.replace('/register')}
            testID="login-to-register-button"
          />
        </View>
      </View>
    </Screen>
  )
}
