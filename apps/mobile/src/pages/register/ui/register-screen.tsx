import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Screen } from '@/shared/ui/screen'
import { Text } from '@/shared/ui/text'
import { useAuth } from '@/entities/session'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'

const MIN_PASSWORD_LENGTH = 8

export function RegisterScreen() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      setError('Введите email и пароль')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`)
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await register(email.trim(), password)
      if (result.ok) router.back()
    } catch (cause) {
      setError(getRepositoryErrorText(cause))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Screen testID="screen-register">
      <View className="gap-6 p-6 justify-center">
        <View className="gap-2">
          <Text variant="h1">Создать аккаунт</Text>
          <Text variant="body" className="text-muted-foreground">
            Регистрация начинает пустой список категорий
          </Text>
        </View>

        <View className="gap-4">
          <Input
            label="Email"
            placeholder="Введите email"
            value={email}
            onChangeText={setEmail}
            leadingIcon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="register-email-input"
          />

          <Input
            label="Пароль"
            placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
            value={password}
            onChangeText={setPassword}
            leadingIcon="lock-closed"
            secureTextEntry
            testID="register-password-input"
          />

          <Input
            label="Повторите пароль"
            placeholder="Введите пароль ещё раз"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            leadingIcon="lock-closed"
            secureTextEntry
            testID="register-confirm-input"
          />

          {error ? (
            <Text variant="body-sm" className="text-destructive" testID="register-error-text">
              {error}
            </Text>
          ) : null}

          <Button
            variant="primary"
            text="Зарегистрироваться"
            onPress={handleRegister}
            loading={isLoading}
            testID="register-submit-button"
          />
        </View>

        <View className="flex-row items-center gap-2 self-center">
          <Text variant="body-sm" className="text-muted-foreground">
            Уже есть аккаунт?
          </Text>
          <Button
            variant="ghost"
            text="Войти"
            size="sm"
            onPress={() => router.back()}
            testID="register-to-login-button"
          />
        </View>
      </View>
    </Screen>
  )
}
