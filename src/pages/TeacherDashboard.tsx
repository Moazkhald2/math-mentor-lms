import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import OverviewView from '../components/teacher/OverviewView'
import StudentsView from '../components/teacher/StudentsView'
import ExamsView from '../components/teacher/ExamsView'
import BankView from '../components/teacher/BankView'
import WrongAnswersView from '../components/teacher/WrongAnswersView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { ALL_GRADES } from '../lib/grades'

interface GroupOption {
  id: string
  name: string
  grade: number
}

interface StudentOption {
  id: string
  full_name: string | null
  email: string | null
  grade: number | null
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [gradeFilter, setGradeFilter] = useState<number | undefined>(undefined)
  const [groupFilter, setGroupFilter] = useState<string>('')
  const [studentFilter, setStudentFilter] = useState<string>('')

  const roleQ = useQuery({
    queryKey: ['td-role', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return data as { role: string } | null
    },
    enabled: !!user,
  })

  const isStaff = roleQ.data?.role === 'teacher' || roleQ.data?.role === 'admin'

  const groupsQ = useQuery({
    queryKey: ['td-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, grade').order('grade').order('name')
      return (data ?? []) as GroupOption[]
    },
    enabled: isStaff,
  })

  const groupMembersQ = useQuery({
    queryKey: ['td-group-members', groupFilter],
    queryFn: async () => {
      if (!groupFilter) return [] as string[]
      const { data } = await supabase
        .from('class_members')
        .select('student_id')
        .eq('class_id', groupFilter)
      return (data ?? []).map((r: { student_id: string }) => r.student_id)
    },
    enabled: isStaff && !!groupFilter,
  })

  const studentsQ = useQuery({
    queryKey: ['td-filter-students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, grade')
        .eq('role', 'student')
        .order('full_name')
      return (data ?? []) as StudentOption[]
    },
    enabled: isStaff,
  })

  const groupStudentIds = useMemo(() => {
    if (!groupFilter) return undefined
    return new Set(groupMembersQ.data ?? [])
  }, [groupFilter, groupMembersQ.data])

  const visibleGroups = useMemo(() => {
    const list = groupsQ.data ?? []
    if (!gradeFilter) return list
    return list.filter((g) => g.grade === gradeFilter)
  }, [groupsQ.data, gradeFilter])

  const visibleStudents = useMemo(() => {
    return (studentsQ.data ?? []).filter((s) => {
      if (gradeFilter && s.grade !== gradeFilter) return false
      if (groupStudentIds && !groupStudentIds.has(s.id)) return false
      return true
    })
  }, [studentsQ.data, gradeFilter, groupStudentIds])

  useEffect(() => {
    const role = roleQ.data?.role
    if (roleQ.isSuccess && role !== 'teacher' && role !== 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [roleQ.data, roleQ.isSuccess, navigate])

  if (!user || !isStaff) {
    return null
  }

  const hasFilters = gradeFilter !== undefined || !!groupFilter || !!studentFilter

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Teacher Command Center
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Filter by Grade, Group, or Single Student — track scores and most common wrong answers.
          </p>
        </div>

        {/* Cascading Grade -> Group -> Single Student Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <span>Grade</span>
            <select
              aria-label="Filter command center by grade"
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-ink"
              value={gradeFilter ?? ''}
              onChange={(e) => {
                setGradeFilter(e.target.value ? Number(e.target.value) : undefined)
                setGroupFilter('')
                setStudentFilter('')
              }}
            >
              <option value="">All grades</option>
              {ALL_GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <span>Group</span>
            <select
              aria-label="Filter command center by group"
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-ink"
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value)
                setStudentFilter('')
              }}
            >
              <option value="">All groups</option>
              {visibleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  G{g.grade} · {g.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <span>Student</span>
            <select
              aria-label="Filter command center by student"
              className="min-w-[180px] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-ink"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="">All students</option>
              {visibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name ? `${s.full_name} (${s.email ?? ''})` : s.email ?? s.id}
                </option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setGradeFilter(undefined)
                setGroupFilter('')
                setStudentFilter('')
              }}
              className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:border-brand hover:text-brand"
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      </header>

      <Tabs defaultValue="overview">
        <TabsList aria-label="Teacher dashboard sections" className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wrong-answers">Wrong Answers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="bank">Question Bank</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewView
            userId={user.id}
            grade={gradeFilter}
            groupStudentIds={groupStudentIds}
            studentId={studentFilter || undefined}
          />
        </TabsContent>
        <TabsContent value="wrong-answers">
          <WrongAnswersView
            grade={gradeFilter}
            groupStudentIds={groupStudentIds}
            studentId={studentFilter || undefined}
          />
        </TabsContent>
        <TabsContent value="students">
          <StudentsView
            grade={gradeFilter}
            groupStudentIds={groupStudentIds}
            studentId={studentFilter || undefined}
          />
        </TabsContent>
        <TabsContent value="exams">
          <ExamsView userId={user.id} grade={gradeFilter} />
        </TabsContent>
        <TabsContent value="bank">
          <BankView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
