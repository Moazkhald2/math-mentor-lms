import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Questions = lazy(() => import('./pages/Questions'))
const Exams = lazy(() => import('./pages/Exams'))
const Exam = lazy(() => import('./pages/Exam'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Results = lazy(() => import('./pages/Results'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'))
const Profile = lazy(() => import('./pages/Profile'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Admin = lazy(() => import('./pages/Admin'))
const Practice = lazy(() => import('./pages/Practice'))
const WeakPoints = lazy(() => import('./pages/WeakPoints'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Layout>{children}</Layout>
    </AuthProvider>
  )
}

function Loader() {
  return <div className="flex min-h-[50vh] items-center justify-center text-text-muted">Loading…</div>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<AppLayout><Home /></AppLayout>} />
              <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
              <Route path="/register" element={<AppLayout><Register /></AppLayout>} />
              <Route path="/questions" element={<AppLayout><Questions /></AppLayout>} />
              <Route path="/exams" element={<AppLayout><Exams /></AppLayout>} />
              <Route path="/exam/:id" element={<AppLayout><Exam /></AppLayout>} />
              <Route path="/practice/:id" element={<AppLayout><Practice /></AppLayout>} />
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
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
