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

// Auth protection lives in each protected page via supabase.auth.getSession().
// This wrapper is intentionally passive — no redirect here — so that email
// confirmation links (which trigger onAuthStateChange) don't interfere with
// the user's current location. Login redirects to /dashboard explicitly.
function RequireAuth({ children }) {
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/dashboard/connect" element={<RequireAuth><ConnectAWS /></RequireAuth>} />
        <Route path="/dashboard/reports" element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/dashboard/reports/:id" element={<RequireAuth><ReportDetail /></RequireAuth>} />
        <Route path="/dashboard/billing" element={<RequireAuth><Billing /></RequireAuth>} />
        <Route path="/dashboard/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
