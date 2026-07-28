import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const resetSuccess = searchParams.get('reset') === 'success'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = await signIn(email, password)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <div className="mx-auto mt-16 max-w-md">
      <h1 className="mb-6 text-3xl font-bold text-text">Sign In</h1>

      {resetSuccess && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-accent-green">
          ✓ Password has been reset. Sign in with your new password.
        </div>
      )}

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
        <div>
          <label className="mb-1 block text-sm text-text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text outline-none focus:border-brand"
            required
          />
        </div>

        <div className="flex justify-end">
          <a href="/forgot-password" className="text-xs text-text-muted hover:text-brand">
            Forgot password?
          </a>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="text-center text-sm text-text-muted">
          No account?{' '}
          <a href="/register" className="text-brand hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  )
}