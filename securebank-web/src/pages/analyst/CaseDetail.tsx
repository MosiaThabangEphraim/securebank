import { AppShell } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/shared/EmptyState'
import { FileText } from 'lucide-react'

export const CaseDetail: React.FC = () => {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Case Detail</h1>
        <p className="text-gray-400 mb-8">View detailed case information</p>

        <div className="bg-dark-900 rounded-lg border border-dark-800 p-8">
          <EmptyState
            icon={FileText}
            title="No case selected"
            description="Select a case to view details"
          />
        </div>
      </div>
    </AppShell>
  )
}
