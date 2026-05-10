import { AppShell } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/shared/EmptyState'
import { Search } from 'lucide-react'

export const AccountInvestigation: React.FC = () => {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Account Investigation</h1>
        <p className="text-gray-400 mb-8">Investigate account activity</p>

        <div className="bg-dark-900 rounded-lg border border-dark-800 p-8">
          <EmptyState
            icon={Search}
            title="No account selected"
            description="Search for an account to investigate"
          />
        </div>
      </div>
    </AppShell>
  )
}
