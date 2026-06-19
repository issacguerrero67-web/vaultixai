import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ConnectAWS from './pages/ConnectAWS'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import Settings from './pages/Settings'

// Placeholder auth guard — replace with real Supabase session check
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
        <Route path="/dashboard/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
