import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { FormError } from './form-error'
import { FormField } from './form-field'
import { FormLabel } from './form-label'

describe('Form presentation components', () => {
  it('FormField and FormLabel render their children', () => {
    render(
      <FormField testID="field">
        <FormLabel>Название</FormLabel>
      </FormField>,
    )

    expect(screen.getByTestId('field')).toBeTruthy()
    expect(screen.getByText('Название')).toBeTruthy()
  })

  it('FormError renders nothing without a message', () => {
    render(<FormError testID="field-error">{undefined}</FormError>)

    expect(screen.queryByTestId('field-error')).toBeNull()
  })

  it('FormError announces the message as an alert', () => {
    render(<FormError testID="field-error">Введите название</FormError>)

    expect(screen.getByTestId('field-error').props.accessibilityRole).toBe('alert')
    expect(screen.getByText('Введите название')).toBeTruthy()
  })
})
