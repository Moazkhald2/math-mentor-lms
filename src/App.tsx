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
import RequireAuth from './components/RequireAuth'
import Admin from './pages/Admin'
import Practice from './pages/Practice'
import WeakPoints from './pages/WeakPoints'
import Bookmarks from './pages/Bookmarks'
import GrapherPage from './pages/GrapherPage'
import JoinGroup from './pages/JoinGroup'
import Schedule from './pages/Schedule'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'

// Scalable QueryClient config tuned for 1,000+ concurrent students:
// - refetchOnWindowFocus disabled prevents 1,000 simultaneous students from hammering DB on tab focus
// - 5min staleTime caches questions and exams in client memory
// - 2 retries handles transient network blips automatically
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})

function AppLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Layout>
      <RequireAuth>{children}</RequireAuth>
    </Layout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public auth & landing routes only */}
              <Route path="/" element={<AppLayout><Home /></AppLayout>} />
              <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
              <Route path="/register" element={<AppLayout><Register /></AppLayout>} />
              <Route path="/forgot-password" element={<AppLayout><ForgotPassword /></AppLayout>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/join/:code" element={<AppLayout><JoinGroup /></AppLayout>} />
              <Route path="/privacy" element={<AppLayout><PrivacyPolicy /></AppLayout>} />
              <Route path="/terms" element={<AppLayout><TermsOfService /></AppLayout>} />

              {/* Protected LMS content routes — mandatory sign-in */}
              <Route path="/sheets" element={<ProtectedLayout><Sheets /></ProtectedLayout>} />
              <Route path="/exams" element={<ProtectedLayout><Exams /></ProtectedLayout>} />
              <Route path="/schedule" element={<ProtectedLayout><Schedule /></ProtectedLayout>} />
              <Route path="/exam/:id" element={<RequireAuth><Exam /></RequireAuth>} />
              <Route path="/practice/:id" element={<RequireAuth><Practice /></RequireAuth>} />
              <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
              <Route path="/grapher" element={<ProtectedLayout><GrapherPage /></ProtectedLayout>} />
              <Route path="/weak-points" element={<ProtectedLayout><WeakPoints /></ProtectedLayout>} />
              <Route path="/bookmarks" element={<ProtectedLayout><Bookmarks /></ProtectedLayout>} />
              <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
              <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
              <Route path="/teacher" element={<ProtectedLayout><TeacherDashboard /></ProtectedLayout>} />
              <Route path="/results/:attemptId" element={<ProtectedLayout><Results /></ProtectedLayout>} />
              <Route path="/complete-profile" element={<ProtectedLayout><CompleteProfile /></ProtectedLayout>} />
              <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
              <Route path="/admin/:section" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
              <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App