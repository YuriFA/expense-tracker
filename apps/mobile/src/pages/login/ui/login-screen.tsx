import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button } from '@/shared/ui/button'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { Text } from '@/shared/ui/text'
import { useAuth } from '@/entities/session'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { loginSchema, type LoginFormValues } from '../model/schema'

export function LoginScreen() {
  const { login } = useAuth()
  // Optional return path (e.g. an invitation deep link that bounced here
  // while unauthenticated): wins over the plain back navigation.
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleSubmit = async ({ email, password }: LoginFormValues) => {
    try {
      const result = await login(email.trim(), password)
      if (result.ok && redirect) router.navigate(redirect)
      else if (result.ok) router.back()
      // A cancelled ownership takeover stays on this screen by design.
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
    }
  }

  return (
    <Screen testID="screen-login" topInset={false}>
      <ScreenHeader title="Вход" />

      <ScreenScrollView>
        <View className="px-6 gap-6">
          <Text variant="body" className="text-muted-foreground">
            Войдите, чтобы синхронизировать данные
          </Text>

          <View className="gap-4">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormField>
                  <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
                    Email
                  </FormLabel>
                  <Input
                    placeholder="Введите email"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    leadingIcon="mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    invalid={Boolean(fieldState.error)}
                    testID="login-email-input"
                  />
                  <FormError testID="login-email-error">{fieldState.error?.message}</FormError>
                </FormField>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormField>
                  <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
                    Пароль
                  </FormLabel>
                  <Input
                    placeholder="Введите пароль"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    leadingIcon="lock-closed"
                    secureTextEntry
                    invalid={Boolean(fieldState.error)}
                    testID="login-password-input"
                  />
                  <FormError testID="login-password-error">{fieldState.error?.message}</FormError>
                </FormField>
              )}
            />

            <FormError testID="login-error-text">{form.formState.errors.root?.message}</FormError>

            <Button
              variant="primary"
              text="Войти"
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
              onPress={form.handleSubmit(handleSubmit)}
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
              // Carry the return path through so post-register lands on it.
              onPress={() =>
                redirect
                  ? router.push({ pathname: '/register', params: { redirect } })
                  : router.push('/register')
              }
              testID="login-to-register-button"
            />
          </View>
        </View>
      </ScreenScrollView>
    </Screen>
  )
}
