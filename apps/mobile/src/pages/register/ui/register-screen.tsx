import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/shared/ui/button'
import { FormError, FormField, FormLabel } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { Screen } from '@/shared/ui/screen'
import { Text } from '@/shared/ui/text'
import { useAuth } from '@/entities/session'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'
import { MIN_PASSWORD_LENGTH, registerSchema, type RegisterFormValues } from '../model/schema'

export function RegisterScreen() {
  const { register } = useAuth()
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const handleSubmit = async ({ email, password }: RegisterFormValues) => {
    try {
      const result = await register(email.trim(), password)
      if (result.ok) router.back()
      // A cancelled ownership takeover stays on this screen by design.
    } catch (cause) {
      form.setError('root', { message: getRepositoryErrorText(cause) })
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
                  testID="register-email-input"
                />
                <FormError testID="register-email-error">{fieldState.error?.message}</FormError>
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
                  placeholder={`Минимум ${MIN_PASSWORD_LENGTH} символов`}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  leadingIcon="lock-closed"
                  secureTextEntry
                  invalid={Boolean(fieldState.error)}
                  testID="register-password-input"
                />
                <FormError testID="register-password-error">{fieldState.error?.message}</FormError>
              </FormField>
            )}
          />

          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormField>
                <FormLabel className={fieldState.error ? 'text-destructive' : undefined}>
                  Повторите пароль
                </FormLabel>
                <Input
                  placeholder="Введите пароль ещё раз"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  leadingIcon="lock-closed"
                  secureTextEntry
                  invalid={Boolean(fieldState.error)}
                  testID="register-confirm-input"
                />
                <FormError testID="register-confirm-error">{fieldState.error?.message}</FormError>
              </FormField>
            )}
          />

          <FormError testID="register-error-text">{form.formState.errors.root?.message}</FormError>

          <Button
            variant="primary"
            text="Зарегистрироваться"
            loading={form.formState.isSubmitting}
            disabled={form.formState.isSubmitting}
            onPress={form.handleSubmit(handleSubmit)}
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
