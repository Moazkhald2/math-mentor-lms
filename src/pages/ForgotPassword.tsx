import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) setError(err.message)
    else setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-text">Check your email</h1>
        <p className="text-text-muted">
          We sent a password reset link to <strong>{email}</strong>
        </p>
        <a href="/login" className="mt-6 inline-block text-sm text-brand hover:underline">
          Back to Sign In
        </a>
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

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className="text-center text-sm text-text-muted">
          Remember your password?{' '}
          <a href="/login" className="text-brand hover:underline">Sign in</a>
        </p>
      </form>
    </div>
  )
}
