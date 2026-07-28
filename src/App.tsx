import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from './hooks/useAuth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Questions from './pages/Questions'
import Exams from './pages/Exams'
import Exam from './pages/Exam'
import Dashboard from './pages/Dashboard'
import Results from './pages/Results'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AuthCallback from './pages/AuthCallback'
import Layout from './components/Layout'

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Home /></AppLayout>} />
          <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
          <Route path="/register" element={<AppLayout><Register /></AppLayout>} />
          <Route path="/questions" element={<AppLayout><Questions /></AppLayout>} />
          <Route path="/exams" element={<AppLayout><Exams /></AppLayout>} />
          <Route path="/exam/:id" element={<Exam />} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/results/:attemptId" element={<AppLayout><Results /></AppLayout>} />
          <Route path="/forgot-password" element={<AppLayout><ForgotPassword /></AppLayout>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App