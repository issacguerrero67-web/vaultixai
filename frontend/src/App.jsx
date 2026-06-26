import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ConnectAWS from './pages/ConnectAWS'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import ResetPassword from './pages/ResetPassword'
import AWSAccounts from './pages/AWSAccounts'
import Autopilot from './pages/Autopilot'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import { supabase } from './lib/supabase'

function RequireAuth({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  if (session === undefined) return null // still loading
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/dashboard/accounts" element={<RequireAuth><AWSAccounts /></RequireAuth>} />
        <Route path="/dashboard/connect" element={<RequireAuth><ConnectAWS /></RequireAuth>} />
        <Route path="/dashboard/reports" element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/dashboard/reports/:id" element={<RequireAuth><ReportDetail /></RequireAuth>} />
        <Route path="/dashboard/billing" element={<RequireAuth><Billing /></RequireAuth>} />
        <Route path="/dashboard/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/dashboard/autopilot" element={<RequireAuth><Autopilot /></RequireAuth>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
