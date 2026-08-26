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
  return /^\+?\d{8,15}$/.test(phone.trim())
}
