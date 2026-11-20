/**
 * Validates a relative post-login redirect path so external / protocol-relative
 * URLs (e.g. `//evil.com`, `https://evil.com`) are rejected safely.
 */
export function getSafeNextPath(raw: string | null | undefined, fallback = '/exams'): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\r') ||
    trimmed.includes('\n')
  ) {
    return fallback
  }
  return trimmed
}

/**
 * If a post-login redirect points to `/join/:code`, extract the invite code
 * so switching from Login -> Sign Up keeps the group invite intact.
 */
export function extractInviteCodeFromNext(nextPath: string | null | undefined): string | null {
  if (!nextPath) return null
  const match = nextPath.match(/^\/join\/([^/?#]+)/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1]).trim().toUpperCase() || null
  } catch {
    return match[1].trim().toUpperCase() || null
  }
}
