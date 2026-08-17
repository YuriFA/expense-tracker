// Register screen behavior under React Hook Form: per-field validation
// (short password, mismatched confirm), server errors at the root slot with
// values preserved, and pending state blocking duplicates. `useAuth` and the
// router are mocked at the boundary.

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AlreadyExistsError } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { RegisterScreen } from './register-screen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}))

jest.mock('@/entities/session', () => {
  const registerMock = jest.fn()
  return { useAuth: () => ({ register: registerMock }), registerMock }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { router } = require('expo-router') as { router: { back: jest.Mock } }

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registerMock } = require('@/entities/session') as {
  registerMock: ReturnType<typeof jest.fn>
}

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

function renderRegister() {
  render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <RegisterScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  )
}

function fillValid(password = 'longenough') {
  fireEvent.changeText(screen.getByTestId('register-email-input'), 'user@example.com')
  fireEvent.changeText(screen.getByTestId('register-password-input'), password)
  fireEvent.changeText(screen.getByTestId('register-confirm-input'), password)
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks a mismatched confirm with the confirm-field error', async () => {
    renderRegister()

    fireEvent.changeText(screen.getByTestId('register-email-input'), 'user@example.com')
    fireEvent.changeText(screen.getByTestId('register-password-input'), 'longenough')
    fireEvent.changeText(screen.getByTestId('register-confirm-input'), 'different1')
    fireEvent.press(screen.getByTestId('register-submit-button'))

    expect(await screen.findByTestId('register-confirm-error')).toHaveTextContent(
      'Пароли не совпадают',
    )
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('blocks a short password with the minimum-length message', async () => {
    renderRegister()

    fireEvent.changeText(screen.getByTestId('register-email-input'), 'user@example.com')
    fireEvent.changeText(screen.getByTestId('register-password-input'), 'short')
    fireEvent.changeText(screen.getByTestId('register-confirm-input'), 'short')
    fireEvent.press(screen.getByTestId('register-submit-button'))

    expect(await screen.findByTestId('register-password-error')).toHaveTextContent(
      'Пароль должен содержать минимум 8 символов',
    )
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('submits the trimmed email with the password on valid input', async () => {
    registerMock.mockResolvedValue({ ok: true })
    renderRegister()

    fireEvent.changeText(screen.getByTestId('register-email-input'), '  user@example.com  ')
    fireEvent.changeText(screen.getByTestId('register-password-input'), 'longenough')
    fireEvent.changeText(screen.getByTestId('register-confirm-input'), 'longenough')
    fireEvent.press(screen.getByTestId('register-submit-button'))

    await waitFor(() => expect(registerMock).toHaveBeenCalledWith('user@example.com', 'longenough'))
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1))
  })

  it('surfaces a repository error at the root slot and keeps the values', async () => {
    registerMock.mockRejectedValue(
      new AlreadyExistsError('User already exists', { apiCode: 'USER_ALREADY_EXISTS' }),
    )
    renderRegister()

    fillValid()
    fireEvent.press(screen.getByTestId('register-submit-button'))

    await waitFor(() =>
      expect(screen.getByTestId('register-error-text')).toHaveTextContent('Уже существует'),
    )
    expect(screen.getByTestId('register-email-input').props.value).toBe('user@example.com')
    expect(screen.getByTestId('register-password-input').props.value).toBe('longenough')
  })

  it('blocks a double submit while the registration is pending', async () => {
    let resolveRegister: (result: { ok: boolean }) => void = () => {}
    registerMock.mockImplementation(
      () => new Promise<{ ok: boolean }>((resolve) => void (resolveRegister = resolve)),
    )
    renderRegister()

    fillValid()
    fireEvent.press(screen.getByTestId('register-submit-button'))

    await waitFor(() =>
      expect(screen.getByTestId('register-submit-button').props.accessibilityState.disabled).toBe(
        true,
      ),
    )
    fireEvent.press(screen.getByTestId('register-submit-button'))
    expect(registerMock).toHaveBeenCalledTimes(1)

    resolveRegister({ ok: true })
  })
})
