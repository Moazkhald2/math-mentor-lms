const entityMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

export function sanitize(input: string): string {
  return input.replace(/[&<>"']/g, (char) => entityMap[char] ?? char)
}
