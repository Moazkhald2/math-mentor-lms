// Disposable/temporary email domains commonly used to bypass signup checks.
const BLOCKED = [
  'mailinator.com', 'temp-mail.org', 'tempmail.com', 'guerrillamail.com',
  'yopmail.com', '10minutemail.com', 'throwawaymail.com', 'sharklasers.com',
  'getnada.com', 'dispostable.com', 'fakeinbox.com', 'trashmail.com',
  'maildrop.cc', 'mohmal.com', 'emailondeck.com',
]

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim() ?? ''
  if (!domain) return false
  return BLOCKED.some((b) => domain === b || domain.endsWith(`.${b}`))
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw)
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return /^\+?\d{8,15}$/.test(cleaned.trim())
}

/** Strict email shape: local@domain.tld (2+ letter TLD), no spaces. */
export function isValidEmailFormat(email: string): boolean {
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  return re.test(email.trim()) && !email.includes('..')
}

/** Names: letters (incl. Arabic ranges), spaces, hyphens, apostrophes; 2–40 chars. */
export function isValidName(name: string): boolean {
  const re = /^[\p{L}\p{M}' -]{2,40}$/u
  return re.test(name.trim())
}

/** Multi-part full names (e.g., Guardian full name in Arabic or English); 2–80 chars. */
export function isValidFullName(name: string): boolean {
  const re = /^[\p{L}\p{M}' -]{2,80}$/u
  return re.test(name.trim())
}
