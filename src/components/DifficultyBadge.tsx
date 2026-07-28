import type { Difficulty } from '../types'
import { DIFFICULTY_LABELS } from '../types'

const colors: Record<Difficulty, string> = {
  1: 'border-accent-green text-accent-green bg-accent-green/10',
  2: 'border-brand text-brand bg-brand/10',
  3: 'border-accent-gold text-accent-gold bg-accent-gold/10',
  4: 'border-danger text-danger bg-danger/10',
}

export default function DifficultyBadge({ level }: { level: Difficulty }) {
  return (
    <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${colors[level]}`}>
      {DIFFICULTY_LABELS[level]}
    </span>
  )
}
