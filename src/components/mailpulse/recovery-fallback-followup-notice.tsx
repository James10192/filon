import { CalendarClock } from 'lucide-react'

export function RecoveryFallbackFollowupNotice() {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg-muted">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" />
      <span>
        Une relance locale a été planifiée pour vérifier si le paiement a été
        reçu.
      </span>
    </div>
  )
}

