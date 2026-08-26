import { describe, it, expect } from 'vitest'
import { isDisposableEmail, isValidPassword, isValidPhone } from '../../lib/validation'

describe('isDisposableEmail', () => {
  it('blocks known disposable domains', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true)
    expect(isDisposableEmail('y@sub.temp-mail.org')).toBe(true)
  })
  it('allows normal providers', () => {
    expect(isDisposableEmail('student@gmail.com')).toBe(false)
    expect(isDisposableEmail('parent@yahoo.co.uk')).toBe(false)
  })
  it('handles malformed input safely', () => {
    expect(isDisposableEmail('noatsign')).toBe(false)
    expect(isDisposableEmail('')).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('requires 8+ chars with letter and number', () => {
    expect(isValidPassword('abc12345')).toBe(true)
    expect(isValidPassword('short1')).toBe(false)
    expect(isValidPassword('nonumbershere')).toBe(false)
    expect(isValidPassword('12345678')).toBe(false)
  })
})

describe('isValidPhone', () => {
  it('accepts international formats', () => {
    expect(isValidPhone('+201001234567')).toBe(true)
    expect(isValidPhone('01001234567')).toBe(true)
  })
  it('rejects letters and short numbers', () => {
    expect(isValidPhone('abc')).toBe(false)
    expect(isValidPhone('123')).toBe(false)
    expect(isValidPhone('')).toBe(false)
  })
})
