import { describe, it, expect } from 'vitest'
import { sanitize } from '../../lib/sanitize'

describe('sanitize', () => {
  it('escapes ampersand', () => {
    expect(sanitize('a & b')).toBe('a &amp; b')
  })

  it('escapes less-than', () => {
    expect(sanitize('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater-than', () => {
    expect(sanitize('5 > 3')).toBe('5 &gt; 3')
  })

  it('escapes double quote', () => {
    expect(sanitize('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quote', () => {
    expect(sanitize("it's")).toBe('it&#x27;s')
  })

  it('handles empty string', () => {
    expect(sanitize('')).toBe('')
  })

  it('handles string with no special chars', () => {
    expect(sanitize('hello world 123')).toBe('hello world 123')
  })

  it('escapes all special chars together', () => {
    expect(sanitize('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#x27;')
  })
})
