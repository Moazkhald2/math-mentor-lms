import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function CompleteProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [grade, setGrade] = useState<number | ''>('')
  const [parentPhone, setParentPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('full_name, grade, parent_phone').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || user?.user_metadata?.full_name || '')
          if (data.grade) setGrade(data.grade)
          if (data.parent_phone) setParentPhone(data.parent_phone)
        }
      })
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!grade) { setError('Please select your grade'); return }
    setSaving(true)
    const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (authErr) { setError(authErr.message); setSaving(false); return }
    const { error: dbErr } = await supabase.from('profiles').update({
      full_name: fullName,
      grade,
      parent_phone: parentPhone,
    }).eq('id', user!.id)
    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    navigate('/dashboard', { replace: true })
  }

  if (!user) return <p className="text-text-muted">Please sign in first.</p>

  return (
    <div className="mx-auto max-w-md pt-12">
      <h1 className="mb-2 text-3xl font-black text-text">Complete Your Profile</h1>
      <p className="mb-8 text-text-muted">Just a couple more details to get started.</p>

      {error && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-danger">{error}</p>}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-text-muted">Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} required
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink" />
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Grade <span className="text-danger">*</span></label>
          <select value={grade} onChange={e => setGrade(e.target.value ? Number(e.target.value) : '')} required
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink">
            <option value="">Select your grade</option>
            {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-muted">Parent Phone <span className="text-text-muted/60">(optional, for progress reports)</span></label>
          <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="+1234567890"
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink" />
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-brand px-6 py-3 font-bold text-white hover:bg-brand-light disabled:opacity-50">
          {saving ? 'Saving...' : 'Get Started'}
        </button>
      </form>
    </div>
  )
}
