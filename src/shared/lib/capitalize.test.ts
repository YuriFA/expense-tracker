import { describe, it, expect } from 'vitest'
import { capitalizeFirstLetter } from './capitalize'

describe('capitalizeFirstLetter', () => {
  it('capitalizes first letter of lowercase word', () => {
    expect(capitalizeFirstLetter('hello')).toBe('Hello')
  })

  it('leaves already capitalized word unchanged', () => {
    expect(capitalizeFirstLetter('Hello')).toBe('Hello')
  })

  it('handles empty string', () => {
    expect(capitalizeFirstLetter('')).toBe('')
  })

  it('does not lowercase remaining characters', () => {
    expect(capitalizeFirstLetter('hELLO')).toBe('HELLO')
  })

  it('handles single character', () => {
    expect(capitalizeFirstLetter('a')).toBe('A')
  })
})
