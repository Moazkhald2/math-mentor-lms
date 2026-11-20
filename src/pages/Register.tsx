import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { formatAuthEmailError } from './ForgotPassword'
import { isDisposableEmail, isValidPassword, isValidPhone, isValidEmailFormat, isValidName, isValidFullName } from '../lib/validation'
import { ALL_GRADES } from '../lib/grades'
import { previewGroupInvite, savePendingGroupInvite, type GroupInvitePreview } from '../lib/groups'
import { CONSENT_POLICY_VERSION, type AgeBand } from '../lib/legal'

const RESEND_COOLDOWN_SECONDS = 60

export default function Register() {
  const { signUp, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCode = (searchParams.get('invite') ?? '').trim().toUpperCase()

  const [invitePreview, setInvitePreview] = useState<GroupInvitePreview | null>(null)
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteCode))

  useEffect(() => {
    if (!inviteCode) {
      setInvitePreview(null)
      setInviteLoading(false)
      return
    }
    let cancelled = false
    setInviteLoading(true)
    previewGroupInvite(inviteCode)
      .then((res) => {
        if (cancelled) return
        setInvitePreview(res)
        if (res.valid && typeof res.grade === 'number') {
          setGrade(res.grade)
          setConfirmGrade(true)
        }
      })
      .catch(() => {
        if (!cancelled) setInvitePreview({ valid: false, reason: 'invalid_or_disabled' })
      })
      .finally(() => {
        if (!cancelled) setInviteLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [inviteCode])

  useEffect(() => {
    if (!authLoading && user) {
      navigate(inviteCode ? `/join/${encodeURIComponent(inviteCode)}` : '/exams', { replace: true })
    }
  }, [user, authLoading, navigate, inviteCode])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [confirmGrade, setConfirmGrade] = useState(false)
  const [ageBand, setAgeBand] = useState<AgeBand>('under_18')
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const hasValidInvite = Boolean(inviteCode && invitePreview?.valid)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValidName(firstName) || !isValidName(lastName))
      return setError('Names must be 2-40 letters (spaces/hyphens allowed).')
    if (!isValidEmailFormat(email)) return setError('Please enter a valid email like name@example.com.')
    if (isDisposableEmail(email)) return setError('Please use a real email address — temporary emails are not allowed.')
    if (!isValidPassword(password)) return setError('Password must be at least 8 characters and include a letter and a number.')
    if (!grade) return setError('Please select your grade.')

    const cleanPhone = parentPhone.replace(/[\s\-\(\)]/g, '').trim()
    if (ageBand === 'under_18') {
      if (!isValidFullName(guardianName)) {
        return setError('Guardian full name is required for students under 18 (2-80 letters).')
      }
      if (!isValidEmailFormat(guardianEmail)) {
        return setError('Please enter a valid guardian email address (may match parent email for younger grades).')
      }
      if (isDisposableEmail(guardianEmail)) {
        return setError('Guardian email must be a real email address — temporary emails are not allowed.')
      }
      if (!isValidPhone(cleanPhone)) {
        return setError('Parent phone is required so we can send progress reports. Format: +201012345678')
      }
    } else if (cleanPhone && !isValidPhone(cleanPhone)) {
      return setError('Please enter a valid phone number format: +201012345678')
    }

    if (!consentAccepted) {
      return setError(
        ageBand === 'under_18'
          ? 'Legal guardian consent is required under Egyptian Law No. 151 of 2020 before creating an account.'
          : 'Please confirm that you have read and accepted the Privacy Notice and Terms of Service.'
      )
    }

    setLoading(true)
    if (hasValidInvite) {
      savePendingGroupInvite(inviteCode)
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const consentPayload = {
      ageBand,
      guardianName: ageBand === 'under_18' ? guardianName.trim() : '',
      guardianEmail: ageBand === 'under_18' ? guardianEmail.trim().toLowerCase() : '',
      consentVersion: CONSENT_POLICY_VERSION,
      consentAcceptedAt: new Date().toISOString(),
    }
    const err = await signUp(email, password, fullName, grade, cleanPhone, consentPayload)
    if (err) {
      setError(formatAuthEmailError(err))
    } else {
      setSuccess(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    }
    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    setError(null)
    setResendMessage(null)
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    })
    if (err) {
      setError(formatAuthEmailError(err.message))
    } else {
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setResendMessage('Confirmation email resent. Please check your inbox and Spam/Junk folder.')
    }
    setResending(false)
  }

  if (success) {
    const postSignupLogin = hasValidInvite
      ? `/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`
      : '/login'
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-text">Check your email</h1>
        <p className="text-text-muted">
          We sent a confirmation link to <strong>{email}</strong>
        </p>
        {hasValidInvite && invitePreview && (
          <p className="mt-3 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm text-ink">
            Once you confirm your email and sign in, you will join{' '}
            <strong>Grade {invitePreview.grade} &mdash; {invitePreview.group_name}</strong> automatically.
          </p>
        )}
        <p className="mt-2 text-xs text-text-muted">
          If you do not see it within a minute, please check your Spam or Promotions folder.
        </p>
        {resendMessage && <p className="mt-3 text-xs text-accent-green">{resendMessage}</p>}
        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={cooldown > 0 || resending}
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-ink hover:border-brand disabled:opacity-50"
          >
            {resending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend confirmation in ${cooldown}s`
                : 'Resend confirmation email'}
          </button>
          <Link to={postSignupLogin} className="inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-light">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand-light'
  const signInLink = hasValidInvite
    ? `/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`
    : '/login'

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="mb-6 text-3xl font-bold text-text">Create Account</h1>

      {inviteCode && !inviteLoading && hasValidInvite && invitePreview && (
        <div className="mb-5 rounded-xl border border-brand/40 bg-brand/10 p-4 text-sm">
          <p className="font-bold text-brand">
            Joining Grade {invitePreview.grade} &mdash; {invitePreview.group_name}
          </p>
          {invitePreview.schedule_note && (
            <p className="mt-0.5 text-xs text-text-muted">{invitePreview.schedule_note}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Your grade is pre-selected from your teacher&apos;s invite link.
          </p>
        </div>
      )}

      {inviteCode && !inviteLoading && invitePreview && !invitePreview.valid && (
        <div className="mb-5 rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4 text-sm text-ink">
          This group invite link is no longer active. You can still create your account below or ask your teacher for a fresh link.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-first">Real First Name *</label>
            <input id="reg-first" name="firstName" type="text" maxLength={40} value={firstName} onChange={e => setFirstName(e.target.value)}
              className={inputCls} required autoComplete="given-name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-last">Real Last Name *</label>
            <input id="reg-last" name="lastName" type="text" maxLength={40} value={lastName} onChange={e => setLastName(e.target.value)}
              className={inputCls} required autoComplete="family-name" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-text-muted">Use your real full name — it appears beside your email for your teacher and on reports.</p>
        <div>
          <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-email">Email *</label>
          <input id="reg-email" name="email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
            className={inputCls} required autoComplete="email" />
          <p className="mt-1 text-xs text-text-muted">Must be a real email &mdash; you&apos;ll confirm it by clicking a link.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-password">Password *</label>
          <input id="reg-password" name="password" type="password" maxLength={128} value={password} onChange={e => setPassword(e.target.value)}
            className={inputCls}
            minLength={8} required autoComplete="new-password" />
          <p className="mt-1 text-xs text-text-muted">At least 8 characters, with a letter and a number.</p>
        </div>

        {hasValidInvite && grade ? (
          <div className="rounded-xl border border-brand/40 bg-brand/5 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Grade (Assigned by Group Invite)
            </p>
            <p className="text-3xl font-black text-brand">Grade {grade}</p>
          </div>
        ) : !confirmGrade ? (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Grade *</label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {ALL_GRADES.map(g => (
                <button key={g} type="button" onClick={() => { setGrade(g); setConfirmGrade(true) }}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    grade === g ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
                  }`}>{g}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-brand/40 bg-brand/5 p-4 text-center">
            <p className="text-sm text-text-muted">You selected:</p>
            <p className="text-3xl font-black text-brand">Grade {grade}</p>
            <button type="button" onClick={() => setConfirmGrade(false)}
              className="mt-2 text-sm text-text-muted hover:text-text">Change</button>
          </div>
        )}

        <fieldset className="space-y-2 rounded-xl border border-border bg-surface p-3.5">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">
            Student Age & Guardian Consent (Law No. 151/2020)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setAgeBand('under_18'); setConsentAccepted(false) }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                ageBand === 'under_18'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
              }`}
              aria-pressed={ageBand === 'under_18'}
            >
              Under 18 · أقل من 18 عاماً
            </button>
            <button
              type="button"
              onClick={() => { setAgeBand('adult_18_plus'); setConsentAccepted(false) }}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                ageBand === 'adult_18_plus'
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
              }`}
              aria-pressed={ageBand === 'adult_18_plus'}
            >
              18 or older · 18 عاماً فأكثر
            </button>
          </div>

          {ageBand === 'under_18' && (
            <div className="space-y-3 pt-2">
              <div>
                <label htmlFor="reg-guardian-name" className="mb-1 block text-sm text-text-muted">
                  Guardian Full Name * <span className="text-xs">(اسم ولي الأمر الكامل)</span>
                </label>
                <input
                  id="reg-guardian-name"
                  name="guardianName"
                  type="text"
                  maxLength={80}
                  value={guardianName}
                  onChange={e => setGuardianName(e.target.value)}
                  placeholder="e.g. Khaled Hassan"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-guardian-email" className="mb-1 block text-sm text-text-muted">
                  Guardian Email * <span className="text-xs">(بريد ولي الأمر — يمكن تطابقه في الصفوف الصغرى)</span>
                </label>
                <input
                  id="reg-guardian-email"
                  name="guardianEmail"
                  type="email"
                  maxLength={254}
                  value={guardianEmail}
                  onChange={e => setGuardianEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className={inputCls}
                  required
                />
              </div>
            </div>
          )}
        </fieldset>

        <div>
          <label htmlFor="reg-phone" className="mb-1 block text-sm text-text-muted">
            Parent Phone {ageBand === 'under_18' ? '*' : '(optional)'}{' '}
            <span className="text-xs">(for progress reports via Telegram)</span>
          </label>
          <input id="reg-phone" name="parentPhone" type="tel" maxLength={16} value={parentPhone} onChange={e => setParentPhone(e.target.value)}
            placeholder="+201012345678"
            className={inputCls} required={ageBand === 'under_18'} autoComplete="tel" />
        </div>

        <label
          htmlFor="reg-legal-consent"
          className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5 text-xs leading-relaxed text-text cursor-pointer hover:border-brand/50"
        >
          <input
            id="reg-legal-consent"
            name="consentAccepted"
            type="checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-brand"
            required
          />
          <span className="space-y-1">
            {ageBand === 'under_18' ? (
              <>
                <span dir="rtl" className="block font-semibold text-ink">
                  أقر أنا ولي الأمر القانوني للطالب بأنني قرأت ووافقت على{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    إشعار الخصوصية
                  </Link>{' '}
                  و
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    شروط الاستخدام
                  </Link>{' '}
                  وفقاً لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، وأوافق على إنشاء حساب تعليمي للطالب.
                </span>
                <span className="block text-[11px] text-text-muted">
                  As the student&apos;s legal guardian, I have read and accept the{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    Privacy Notice
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    Terms of Service
                  </Link>{' '}
                  under Egyptian Law No. 151 of 2020 and authorize this educational account.
                </span>
              </>
            ) : (
              <>
                <span dir="rtl" className="block font-semibold text-ink">
                  أقر بأن عمري 18 عاماً فأكثر، وقد قرأت ووافقت على{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    إشعار الخصوصية
                  </Link>{' '}
                  و
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    شروط الاستخدام
                  </Link>
                  .
                </span>
                <span className="block text-[11px] text-text-muted">
                  I confirm I am 18 or older and accept the{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    Privacy Notice
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                    Terms of Service
                  </Link>
                  .
                </span>
              </>
            )}
          </span>
        </label>

        {error && <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? 'Creating account...' : hasValidInvite ? 'Create Account & Join Group' : 'Create Account'}
        </button>
        <p className="text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to={signInLink} className="text-brand-light hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
