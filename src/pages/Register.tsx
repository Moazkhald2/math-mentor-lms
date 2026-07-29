import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
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
    if (!grade) return
    setLoading(true)
    setError(null)
    const err = await signUp(email, password, fullName, grade, parentPhone || undefined)
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

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="mb-6 text-3xl font-bold text-text">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand-light" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-muted">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand-light" required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-muted">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand-light"
            minLength={6} required />
        </div>

        {!confirmGrade ? (
          <div>
            <label className="mb-1 block text-sm text-text-muted">Grade</label>
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
          <label className="mb-1 block text-sm text-text-muted">Parent Phone <span className="text-text-muted/60">(optional — for progress reports)</span></label>
          <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)}
            placeholder="+1234567890"
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand-light" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
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
