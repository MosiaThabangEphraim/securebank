import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { useState } from 'react'

interface FraudAlertBannerProps {
  quarantinedCount: number
  onViewDetails: () => void
}

export const FraudAlertBanner: React.FC<FraudAlertBannerProps> = ({
  quarantinedCount,
  onViewDetails,
}) => {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || quarantinedCount === 0) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-dark-850 p-4 mb-6 animate-fade-in">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-l-xl" />

      <div className="flex items-center justify-between pl-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-400" style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <p className="font-semibold text-amber-300 text-sm">Action Required</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              {quarantinedCount} transaction{quarantinedCount !== 1 ? 's' : ''} flagged and awaiting your review
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition-all shadow-glow-red"
          >
            Review Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-7 h-7 rounded-lg hover:bg-amber-500/20 flex items-center justify-center text-amber-500/60 hover:text-amber-400 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
