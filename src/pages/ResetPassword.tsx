import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    if (hashParams.get('type') === 'recovery') setReady(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) setError(err.message)
    else navigate('/login?reset=success')
    setLoading(false)
  }

  if (!ready) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-text">Invalid Reset Link</h1>
        <p className="text-text-muted">
          This link is invalid or expired. Please request a new one.
        </p>
        <a href="/forgot-password" className="mt-6 inline-block text-sm text-brand hover:underline">
          Request new reset link
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="mb-6 text-3xl font-black text-text">Set New Password</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand"
            minLength={6}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand"
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
