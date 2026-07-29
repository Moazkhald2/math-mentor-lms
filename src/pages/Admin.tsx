import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AdminSidebar from '../components/AdminSidebar'
import AdminDashboard from './admin/AdminDashboard'
import AdminUsers from './admin/AdminUsers'
import AdminClasses from './admin/AdminClasses'
import AdminQuestions from './admin/AdminQuestions'
import AdminExams from './admin/AdminExams'
import AdminAttempts from './admin/AdminAttempts'
import AdminCsvImport from './admin/AdminCsvImport'
import AdminCsvExport from './admin/AdminCsvExport'
import AdminGrading from './admin/AdminGrading'
import AdminViolations from './admin/AdminViolations'
import AdminBulkExams from './admin/AdminBulkExams'
import AdminReferences from './admin/AdminReferences'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: profile, isFetching } = useQuery({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      return data as { role: string } | null
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/login', { replace: true })
    else if (!isFetching && profile && profile.role !== 'admin') navigate('/', { replace: true })
  }, [user, profile, navigate, isFetching, authLoading])

  if (authLoading) return null
  if (!user || !profile || profile.role !== 'admin') return null

  const section = location.pathname.replace('/admin', '') || ''

  return (
    <div className="flex gap-8">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        {section === '' && <AdminDashboard />}
        {section === '/users' && <AdminUsers />}
        {section === '/classes' && <AdminClasses />}
        {section === '/questions' && <AdminQuestions />}
        {section === '/exams' && <AdminExams />}
        {section === '/attempts' && <AdminAttempts />}
        {section === '/csv-import' && <AdminCsvImport />}
        {section === '/csv-export' && <AdminCsvExport />}
        {section === '/grading' && <AdminGrading />}
        {section === '/violations' && <AdminViolations />}
      </div>
    </div>
  )
}
