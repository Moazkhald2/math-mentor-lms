import { hashString } from './shuffle'

export function variantForGroup<T>(groupId: string, variants: T[], seed: string): T | null {
  if (!groupId || variants.length === 0) return null
  const idx = hashString(`${seed}::${groupId}`) % variants.length
  return variants[idx]
}

export function resolveVariant<T extends { variant_group_id: string | null }>(
  base: T,
  seed: string,
  variantPool: T[],
): T {
  if (!base.variant_group_id) return base
  const group = variantPool.filter(q => q.variant_group_id === base.variant_group_id)
  if (group.length === 0) return base
  return variantForGroup(base.variant_group_id, group, seed) ?? base
}
