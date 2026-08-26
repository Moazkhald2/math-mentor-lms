import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import OverviewView from '../components/teacher/OverviewView'
import StudentsView from '../components/teacher/StudentsView'
import ExamsView from '../components/teacher/ExamsView'
import BankView from '../components/teacher/BankView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const roleQ = useQuery({
    queryKey: ['td-role', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return data as { role: string } | null
    },
    enabled: !!user,
  })

  useEffect(() => {
    const role = roleQ.data?.role
    if (roleQ.isSuccess && role !== 'teacher' && role !== 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [roleQ.data, roleQ.isSuccess, navigate])

  if (!user || !roleQ.data || (roleQ.data.role !== 'teacher' && roleQ.data.role !== 'admin')) {
    return null
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Teacher Command Center
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Live view of your exams, students and question bank.
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList aria-label="Teacher dashboard sections">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="bank">Question Bank</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewView userId={user.id} />
        </TabsContent>
        <TabsContent value="students">
          <StudentsView />
        </TabsContent>
        <TabsContent value="exams">
          <ExamsView userId={user.id} />
        </TabsContent>
        <TabsContent value="bank">
          <BankView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
