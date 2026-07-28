import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? '')
  const [grade, setGrade] = useState<number | ''>('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    const { error: err } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (err) { setError(err.message); return }
    if (grade !== '') {
      await supabase.from('profiles').update({ grade }).eq('id', user!.id)
    }
    setMessage('Profile updated')
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); return }
    setMessage('Password changed')
    setPassword('')
  }

  if (!user) return <p className="text-text-muted">Sign in to access settings</p>

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-3xl font-black text-text">Settings</h1>

      {message && <p className="mb-4 rounded-lg bg-accent-green/10 p-3 text-accent-green">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-danger">{error}</p>}

      <form onSubmit={handleProfileUpdate} className="mb-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-bold text-text">Profile</h2>
        <label className="mb-2 block text-sm text-text-muted">Full Name</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} className="mb-4 w-full rounded-lg border border-border bg-white px-4 py-2 text-text" />
        <label className="mb-2 block text-sm text-text-muted">Grade</label>
        <select value={grade} onChange={e => setGrade(e.target.value ? Number(e.target.value) : '')} className="mb-4 w-full rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">Select grade</option>
          {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Save</button>
      </form>

      <form onSubmit={handlePasswordChange} className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-bold text-text">Change Password</h2>
        <label className="mb-2 block text-sm text-text-muted">New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mb-4 w-full rounded-lg border border-border bg-white px-4 py-2 text-text" />
        <button type="submit" className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Update Password</button>
      </form>
    </div>
  )
}