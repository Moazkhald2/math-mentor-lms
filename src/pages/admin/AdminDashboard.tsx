import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['var(--color-brand)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)']

export default function AdminDashboard() {
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
    </div>
  )
}