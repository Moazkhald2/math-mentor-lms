import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AdminSidebar from '../components/AdminSidebar'
import AdminDashboard from './admin/AdminDashboard'
import AdminUsers from './admin/AdminUsers'
import AdminClasses from './admin/AdminClasses'
import AdminQuestions from './admin/AdminQuestions'
import AdminExams from './admin/AdminExams'
import AdminAttempts from './admin/AdminAttempts'

export default function Admin() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!user) navigate('/login')
    else if (profile?.role !== 'admin') navigate('/')
  }, [user, profile, navigate])

  if (!profile || profile.role !== 'admin') return null

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
      </div>
    </div>
  )
}
