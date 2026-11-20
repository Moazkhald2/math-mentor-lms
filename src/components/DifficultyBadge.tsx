import type { Difficulty } from '../types'
import { DIFFICULTY_LABELS } from '../types'

const colors: Record<Difficulty, string> = {
  1: 'badge-success',
  2: 'badge-primary',
  3: 'badge-warning',
  4: 'badge-danger',
  5: 'badge-danger',
  6: 'badge-danger',
}

export default function DifficultyBadge({ level }: { level: Difficulty }) {
  return (
    <span className={`badge ${colors[level]}`}>
      {DIFFICULTY_LABELS[level]}
    </span>
  )
}
