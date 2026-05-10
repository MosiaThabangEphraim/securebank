import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Cards } from './pages/Cards'
import { Beneficiaries } from './pages/Beneficiaries'
import { AlertsPage } from './pages/AlertsPage'
import { DisputePortal } from './pages/DisputePortal'
import { LoginHistory } from './pages/LoginHistory'
import { ReviewZone } from './pages/ReviewZone'
import { FraudRulesSettings } from './pages/FraudRulesSettings'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { ResetPassword } from './pages/ResetPassword'
import { Accounts } from './pages/Accounts'
import './index.css'

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/beneficiaries" element={<Beneficiaries />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/dispute-portal" element={<DisputePortal />} />
          <Route path="/login-history" element={<LoginHistory />} />
          <Route path="/review-zone" element={<ReviewZone />} />
          <Route path="/settings/fraud-rules" element={<FraudRulesSettings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}

export default App
