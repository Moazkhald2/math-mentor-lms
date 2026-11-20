import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const RESEND_COOLDOWN_SECONDS = 60

export function formatAuthEmailError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many') || lower.includes('security purposes')) {
    return 'Too many email requests right now. Please wait 60 seconds and check your Spam/Junk folder before requesting another email.'
  }
  return message
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const sendResetEmail = async () => {
    if (cooldown > 0 || loading) return
    setLoading(true)
    setError(null)
    setNotice(null)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) {
      setError(formatAuthEmailError(err.message))
    } else {
      setSent(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setNotice('Reset link sent. Please check your inbox and Spam/Junk folder.')
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendResetEmail()
  }

  if (sent) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-text">Check your email</h1>
        <p className="text-text-muted">
          We sent a password reset link to <strong>{email}</strong>
        </p>
        {notice && <p className="mt-3 text-xs text-text-muted">{notice}</p>}
        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={sendResetEmail}
            disabled={cooldown > 0 || loading}
            className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-ink hover:border-brand disabled:opacity-50"
          >
            {loading
              ? 'Sending...'
              : cooldown > 0
                ? `Resend link in ${cooldown}s`
                : 'Resend reset link'}
          </button>
          <Link to="/login" className="text-sm text-brand hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="mb-2 text-3xl font-black text-text">Reset Password</h1>
      <p className="mb-6 text-text-muted">Enter your email and we'll send you a reset link</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand"
            required
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || cooldown > 0}
          className="w-full rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? 'Sending...' : cooldown > 0 ? `Please wait ${cooldown}s` : 'Send Reset Link'}
        </button>

        <p className="text-center text-sm text-text-muted">
          Remember your password?{' '}
          <Link to="/login" className="text-brand hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
