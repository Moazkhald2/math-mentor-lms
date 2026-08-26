import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isDisposableEmail, isValidPassword, isValidPhone } from '../lib/validation'

export default function Register() {
  const { signUp } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [confirmGrade, setConfirmGrade] = useState(false)
  const [parentPhone, setParentPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim()) return setError('Please enter your first and last name.')
    if (isDisposableEmail(email)) return setError('Please use a real email address � temporary emails are not allowed.')
    if (!isValidPassword(password)) return setError('Password must be at least 8 characters and include a letter and a number.')
    if (!isValidPhone(parentPhone)) return setError('Parent phone is required so we can send progress reports. Format: +201012345678')
    if (!grade) return

    setLoading(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    const err = await signUp(email, password, fullName, grade, parentPhone)
    if (err) setError(err)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-text">Check your email</h1>
        <p className="text-text-muted">
          We sent a confirmation link to <strong>{email}</strong>
        </p>
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand-light'

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="mb-6 text-3xl font-bold text-text">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-first">First Name *</label>
            <input id="reg-first" name="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              className={inputCls} required autoComplete="given-name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-last">Last Name *</label>
            <input id="reg-last" name="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)}
              className={inputCls} required autoComplete="family-name" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-email">Email *</label>
          <input id="reg-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            className={inputCls} required autoComplete="email" />
          <p className="mt-1 text-xs text-text-muted">Must be a real email � you'll confirm it by clicking a link.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-muted" htmlFor="reg-password">Password *</label>
          <input id="reg-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
            className={inputCls}
            minLength={8} required autoComplete="new-password" />
          <p className="mt-1 text-xs text-text-muted">At least 8 characters, with a letter and a number.</p>
        </div>

        {!confirmGrade ? (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Grade *</label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 3).map(g => (
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

        <div>
          <label htmlFor="reg-phone" className="mb-1 block text-sm text-text-muted">Parent Phone * <span className="text-xs">(for progress reports via Telegram)</span></label>
          <input id="reg-phone" name="parentPhone" type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)}
            placeholder="+201012345678"
            className={inputCls} required autoComplete="tel" />
        </div>

        {error && <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading || !grade}
          className="w-full rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
        <p className="text-center text-sm text-text-muted">
          Already have an account?{' '}
          <a href="/login" className="text-brand-light hover:underline">Sign in</a>
        </p>
      </form>
    </div>
  )
}
