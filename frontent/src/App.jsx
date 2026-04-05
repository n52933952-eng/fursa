import { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { UserContext } from './context/UserContext'
import Login from './pages/Login'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProjects from './pages/admin/AdminProjects'
import AdminDisputes from './pages/admin/AdminDisputes'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminConversations from './pages/admin/AdminConversations'

function App() {
  const { user } = useContext(UserContext)
  const isAdmin = user?.role === 'admin'

  return (
    <Routes>
      {/* Only admins can log in to the web dashboard */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/admin" />} />

      {/* All admin routes under AdminLayout */}
      <Route element={isAdmin ? <AdminLayout /> : <Navigate to="/login" />}>
        <Route path="/admin"              element={<AdminDashboard />} />
        <Route path="/admin/analytics"    element={<AdminAnalytics />} />
        <Route path="/admin/users"        element={<AdminUsers />} />
        <Route path="/admin/conversations" element={<AdminConversations />} />
        <Route path="/admin/projects"     element={<AdminProjects />} />
        <Route path="/admin/disputes"     element={<AdminDisputes />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
      </Route>

      {/* Catch-all → admin home or login */}
      <Route path="*" element={<Navigate to={isAdmin ? '/admin' : '/login'} />} />
    </Routes>
  )
}

export default App
