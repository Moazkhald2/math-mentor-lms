import { formatGradeLabel, isValidGrade } from '../lib/grades'

interface StudentIdentityProps {
  name?: string | null
  email?: string | null
  grade?: number | null
  groupName?: string | null
  compact?: boolean
  showLabels?: boolean
}

/**
 * Displays a student's real full name beside/above their clearly labeled email,
 * plus optional grade & group badges. Ensures teachers and admins never confuse
 * raw email handles with a student's real name.
 */
export default function StudentIdentity({
  name,
  email,
  grade,
  groupName,
  compact = false,
  showLabels = true,
}: StudentIdentityProps) {
  const cleanName = (name ?? '').trim()
  const cleanEmail = (email ?? '').trim()
  const hasRealName = cleanName.length > 0 && cleanName !== cleanEmail

  if (compact) {
    return (
      <div className="min-w-0 leading-tight">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-ink">
            {hasRealName ? cleanName : 'Name not set'}
          </span>
          {!hasRealName && (
            <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              No name
            </span>
          )}
          {isValidGrade(grade) && (
            <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              {formatGradeLabel(grade)}
            </span>
          )}
          {groupName && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              Group: {groupName}
            </span>
          )}
        </div>
        {cleanEmail && (
          <div className="truncate text-xs text-text-muted">
            {showLabels ? `Email: ${cleanEmail}` : cleanEmail}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink">
          {showLabels && <span className="font-normal text-text-muted">Name: </span>}
          {hasRealName ? cleanName : 'Name not set'}
        </span>
        {!hasRealName && (
          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
            Missing real name
          </span>
        )}
        {isValidGrade(grade) && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
            {formatGradeLabel(grade)}
          </span>
        )}
        {groupName && (
          <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-text-muted">
            Group: {groupName}
          </span>
        )}
      </div>
      {cleanEmail && (
        <p className="truncate text-xs text-text-muted">
          {showLabels && <span className="font-medium text-text-muted/80">Email: </span>}
          {cleanEmail}
        </p>
      )}
    </div>
  )
}
