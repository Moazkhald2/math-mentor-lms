import { hashString } from './shuffle'
import type { Question } from '../types'

export function variantForGroup(groupId: string, variants: Question[], seed: string): Question | null {
  if (!groupId || variants.length === 0) return null
  const idx = hashString(`${seed}::${groupId}`) % variants.length
  return variants[idx]
}

export function resolveVariant(base: Question, seed: string, variantPool: Question[]): Question {
  if (!base.variant_group_id) return base
  const group = variantPool.filter(q => q.variant_group_id === base.variant_group_id)
  if (group.length === 0) return base
  return variantForGroup(base.variant_group_id, group, seed) ?? base
}
