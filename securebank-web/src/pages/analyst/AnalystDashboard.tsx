import { AppShell } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/shared/EmptyState'
import { AlertTriangle } from 'lucide-react'

export const AnalystDashboard: React.FC = () => {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Fraud Cases</h1>
        <p className="text-gray-400 mb-8">Review and manage open fraud cases</p>

        <div className="bg-dark-900 rounded-lg border border-dark-800 p-8">
          <EmptyState
            icon={AlertTriangle}
            title="No cases"
            description="No fraud cases to review"
          />
        </div>
      </div>
    </AppShell>
  )
}
