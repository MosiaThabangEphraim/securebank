import { AppShell } from '../components/layout/AppShell'
import { EmptyState } from '../components/shared/EmptyState'
import { Smartphone } from 'lucide-react'

export const DeviceManager: React.FC = () => {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Device Manager</h1>
        <p className="text-gray-400 mb-8">Manage devices accessing your account</p>

        <div className="bg-dark-900 rounded-lg border border-dark-800 p-8">
          <EmptyState
            icon={Smartphone}
            title="No devices"
            description="Your registered devices will appear here"
          />
        </div>
      </div>
    </AppShell>
  )
}
