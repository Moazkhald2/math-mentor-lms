import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Home from './pages/Home'
import Sheets from './pages/Sheets'
import Login from './pages/Login'
import Register from './pages/Register'
import Exams from './pages/Exams'
import Exam from './pages/Exam'
import Dashboard from './pages/Dashboard'
import Results from './pages/Results'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CompleteProfile from './pages/CompleteProfile'
import Profile from './pages/Profile'
import TeacherDashboard from './pages/TeacherDashboard'
import AuthCallback from './pages/AuthCallback'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Admin from './pages/Admin'
import Practice from './pages/Practice'
import WeakPoints from './pages/WeakPoints'
import Bookmarks from './pages/Bookmarks'

const queryClient = new QueryClient()

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Layout>{children}</Layout>
    </AuthProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Home /></AppLayout>} />
          <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
          <Route path="/register" element={<AppLayout><Register /></AppLayout>} />
          <Route path="/sheets" element={<AppLayout><Sheets /></AppLayout>} />
          <Route path="/exams" element={<AppLayout><Exams /></AppLayout>} />
          <Route path="/exam/:id" element={<AuthProvider><Exam /></AuthProvider>} />
          <Route path="/practice/:id" element={<AuthProvider><Practice /></AuthProvider>} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/weak-points" element={<AppLayout><WeakPoints /></AppLayout>} />
          <Route path="/bookmarks" element={<AppLayout><Bookmarks /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
          <Route path="/teacher" element={<AppLayout><TeacherDashboard /></AppLayout>} />
          <Route path="/results/:attemptId" element={<AppLayout><Results /></AppLayout>} />
          <Route path="/forgot-password" element={<AppLayout><ForgotPassword /></AppLayout>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/complete-profile" element={<AppLayout><CompleteProfile /></AppLayout>} />
          <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
          <Route path="/admin/:section" element={<AppLayout><Admin /></AppLayout>} />
          <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App