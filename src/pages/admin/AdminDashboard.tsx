import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fetchLogRetentionDays, pruneOldActivityLogs, type PruneMaintenanceResult } from '../../lib/activity'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['var(--color-brand)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)']

export default function AdminDashboard() {
  const [retentionDays, setRetentionDays] = useState<number>(90)
  const [lastPrune, setLastPrune] = useState<PruneMaintenanceResult | null>(null)
  const [pruneError, setPruneError] = useState<string | null>(null)

  const { data: savedRetention } = useQuery({
    queryKey: ['system-retention-days'],
    queryFn: fetchLogRetentionDays,
  })

  useEffect(() => {
    if (savedRetention) setRetentionDays(savedRetention)
  }, [savedRetention])

  const pruneMutation = useMutation({
    mutationFn: () => pruneOldActivityLogs(retentionDays),
    onSuccess: (res) => {
      setLastPrune(res)
      setRetentionDays(res.retention_days)
      setPruneError(null)
    },
    onError: (e: Error) => {
      setPruneError(e.message)
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, examsRes, attemptsRes, classesRes] = await Promise.all([
        supabase.from('profiles').select('id, role', { count: 'exact', head: false }),
        supabase.from('exams').select('id', { count: 'exact', head: false }),
        supabase.from('exam_attempts').select('id, score').not('score', 'is', null),
        supabase.from('classes').select('id', { count: 'exact', head: false }),
      ])
      return {
        totalUsers: usersRes.count ?? 0,
        totalExams: examsRes.count ?? 0,
        totalAttempts: attemptsRes.count ?? 0,
        totalClasses: classesRes.count ?? 0,
        users: usersRes.data ?? [],
        attempts: attemptsRes.data ?? [],
      }
    },
  })

  const roleData = (() => {
    if (!stats) return []
    const counts: Record<string, number> = {}
    for (const u of stats.users) { counts[u.role] = (counts[u.role] ?? 0) + 1 }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  })()

  const scoreData = (() => {
    if (!stats) return []
    const buckets: Record<string, number> = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
    for (const a of stats.attempts) {
      const s = a.score ?? 0
      if (s <= 20) buckets['0-20']++
      else if (s <= 40) buckets['21-40']++
      else if (s <= 60) buckets['41-60']++
      else if (s <= 80) buckets['61-80']++
      else buckets['81-100']++
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  })()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Users', value: stats?.totalUsers ?? 0, border: 'border-brand/40', badge: 'bg-brand/20 text-brand' },
          { label: 'Exams', value: stats?.totalExams ?? 0, border: 'border-accent-green/40', badge: 'bg-accent-green/20 text-accent-green' },
          { label: 'Attempts', value: stats?.totalAttempts ?? 0, border: 'border-accent-gold/40', badge: 'bg-accent-gold/20 text-accent-gold' },
          { label: 'Classes', value: stats?.totalClasses ?? 0, border: 'border-accent-green/40', badge: 'bg-accent-green/20 text-accent-green' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border bg-surface p-5 ${card.border}`}>
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${card.badge}`}>{card.label}</span>
            <p className="mt-2 text-3xl font-black text-text">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-bold text-text">Users by Role</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-bold text-text">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Portable Free-Tier Maintenance Panel (No pg_cron required) */}
      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text">Database Maintenance</h2>
            <p className="mt-1 text-sm text-text-muted">
              Prune old activity logs and expired rate-limit entries to keep Supabase Free storage well under 500 MB.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <span>Keep last</span>
              <input
                type="number"
                min={7}
                max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(Math.max(7, Number(e.target.value) || 90))}
                className="w-20 rounded-lg border border-border bg-primary px-2.5 py-1.5 text-sm font-semibold text-ink"
              />
              <span>days</span>
            </label>
            <button
              type="button"
              onClick={() => pruneMutation.mutate()}
              disabled={pruneMutation.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
            >
              {pruneMutation.isPending ? 'Running...' : 'Run Maintenance Now'}
            </button>
          </div>
        </div>
        {lastPrune && (
          <p className="mt-3 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
            Done: removed {lastPrune.deleted_activity_logs} old activity log(s) and {lastPrune.deleted_rate_limits} expired rate-limit record(s) (retention: {lastPrune.retention_days} days).
          </p>
        )}
        {pruneError && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {pruneError}
          </p>
        )}
      </div>
    </div>
  )
}
