import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Users, CheckCircle2, Lock, Clock, AlertTriangle, ArrowRight, UserPlus, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import {
  previewGroupInvite,
  redeemGroupInvite,
  clearPendingGroupInvite,
  formatGroupInviteError,
  type GroupInvitePreview,
  type GroupInviteRedeemResult,
} from '../lib/groups'

export default function JoinGroup() {
  const { code = '' } = useParams<{ code: string }>()
  const cleanCode = decodeURIComponent(code).trim().toUpperCase()
  const { user, loading: authLoading } = useAuth()

  const [preview, setPreview] = useState<GroupInvitePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinedResult, setJoinedResult] = useState<GroupInviteRedeemResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingPreview(true)
    setPreviewError(null)
    setJoinError(null)
    setJoinedResult(null)

    if (!cleanCode) {
      setPreview({ valid: false, reason: 'invalid_or_disabled' })
      setLoadingPreview(false)
      return
    }

    previewGroupInvite(cleanCode)
      .then((res) => {
        if (!cancelled) setPreview(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(formatGroupInviteError(err instanceof Error ? err.message : String(err)))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })

    return () => {
      cancelled = true
    }
  }, [cleanCode])

  const handleJoin = async () => {
    if (!user || joining || !cleanCode) return
    setJoining(true)
    setJoinError(null)
    try {
      const result = await redeemGroupInvite(cleanCode)
      clearPendingGroupInvite()
      try {
        localStorage.setItem('math_mentor_current_grade', String(result.grade))
      } catch {
        // ignore
      }
      setJoinedResult(result)
    } catch (err) {
      setJoinError(formatGroupInviteError(err instanceof Error ? err.message : String(err)))
    } finally {
      setJoining(false)
    }
  }

  if (loadingPreview || authLoading) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
        <p className="text-sm text-text-muted">Checking your group invite link...</p>
      </div>
    )
  }

  if (previewError) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-danger/30 bg-surface p-8 text-center shadow-sm space-y-4">
        <AlertTriangle className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />
        <h1 className="text-2xl font-black text-ink">Unable to Verify Invite</h1>
        <p className="text-sm text-text-muted">{previewError}</p>
        <div className="pt-2">
          <Link
            to={user ? '/dashboard' : '/login'}
            className="inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-light"
          >
            {user ? 'Go to Dashboard' : 'Sign In'}
          </Link>
        </div>
      </div>
    )
  }

  if (joinedResult) {
    return (
      <div className="mx-auto mt-14 max-w-md rounded-2xl border border-accent-green/40 bg-surface p-8 text-center shadow-md space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-green/15 text-accent-green">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-black text-ink">
          {joinedResult.already_member ? 'Already Enrolled!' : 'Welcome to Your Group!'}
        </h1>
        <p className="text-sm text-text-muted">
          You are enrolled in{' '}
          <span className="font-bold text-ink">
            Grade {joinedResult.grade} &mdash; {joinedResult.group_name}
          </span>
          . Your grade and group assignments are now synced automatically.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-light"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/exams"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-ink hover:border-brand"
          >
            Open Exams &amp; Sheets
          </Link>
        </div>
      </div>
    )
  }

  if (!preview || !preview.valid) {
    const reason = preview?.reason ?? 'invalid_or_disabled'
    const config =
      reason === 'expired'
        ? {
            icon: <Clock className="mx-auto h-10 w-10 text-accent-gold" aria-hidden="true" />,
            title: 'Invite Link Expired',
            body: 'This group invite link has passed its expiration date. Please ask your teacher for a refreshed link.',
          }
        : reason === 'group_full'
          ? {
              icon: <Users className="mx-auto h-10 w-10 text-accent-gold" aria-hidden="true" />,
              title: 'This Group Is Full',
              body: preview?.group_name
                ? `Grade ${preview.grade} — ${preview.group_name} has reached its maximum number of students. Please contact your teacher for placement.`
                : 'This group has reached its maximum capacity. Please contact your teacher.',
            }
          : {
              icon: <Lock className="mx-auto h-10 w-10 text-text-muted" aria-hidden="true" />,
              title: 'Invite Link Unavailable',
              body: 'This invite link is invalid or currently locked by your teacher. Ask your teacher to enable or share an active link.',
            }

    return (
      <div className="mx-auto mt-14 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm space-y-4">
        {config.icon}
        <h1 className="text-2xl font-black text-ink">{config.title}</h1>
        <p className="text-sm text-text-muted">{config.body}</p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Link
            to={user ? '/dashboard' : '/login'}
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-light"
          >
            {user ? 'Go to Dashboard' : 'Sign In'}
          </Link>
          {!user && (
            <Link
              to="/"
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-ink hover:border-brand"
            >
              Back to Home
            </Link>
          )}
        </div>
      </div>
    )
  }

  const encodedCode = encodeURIComponent(cleanCode)
  const loginNext = encodeURIComponent(`/join/${cleanCode}`)

  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-surface p-8 shadow-md space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Grade {preview.grade} Group Invite
        </div>
        <h1 className="text-3xl font-black text-ink">{preview.group_name}</h1>
        {preview.schedule_note && (
          <p className="text-sm font-medium text-text-muted">{preview.schedule_note}</p>
        )}
        {typeof preview.spots_left === 'number' && (
          <p className="text-xs font-semibold text-accent-green">
            {preview.spots_left} {preview.spots_left === 1 ? 'spot' : 'spots'} remaining
          </p>
        )}
      </div>

      {joinError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {joinError}
        </div>
      )}

      {user ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-bg p-3.5 text-center text-xs text-text-muted">
            <span className="block font-bold text-ink">
              {user.user_metadata?.full_name || 'Signed-in Student'}
            </span>
            {user.email && <span className="block">Email: {user.email}</span>}
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-bold text-white transition hover:bg-brand-light disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            {joining ? 'Joining group...' : `Join Grade ${preview.grade} — ${preview.group_name}`}
          </button>

          <p className="text-center text-xs text-text-muted">
            Joining updates your profile to Grade {preview.grade} and links you to this group&apos;s exams and sheets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-text-muted">
            Sign in or create your student account to join{' '}
            <strong className="text-ink">{preview.group_name}</strong> and unlock your Grade {preview.grade} content.
          </p>

          <Link
            to={`/register?invite=${encodedCode}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-bold text-white transition hover:bg-brand-light"
          >
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Create Student Account &amp; Join
          </Link>

          <Link
            to={`/login?next=${loginNext}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-base font-semibold text-ink transition hover:border-brand"
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            I Already Have an Account &mdash; Sign In
          </Link>
        </div>
      )}
    </div>
  )
}
