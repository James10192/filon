import { Link } from '@tanstack/react-router'
import { MapPin, Coins } from 'lucide-react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { StageChip, TypeChip, DueBadge } from './chips'

/** Carte d'opportunité (vue liste / grille mobile). Clic -> détail. */
export function OpportunityCard({
  opportunity,
}: {
  opportunity: Doc<'opportunities'>
}) {
  return (
    <Link
      to="/app/opportunites/$id"
      params={{ id: opportunity._id }}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-[var(--shadow-pop)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-fg">
          {opportunity.title}
        </h3>
        <StageChip stage={opportunity.stage} compact />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TypeChip type={opportunity.type} />
        {opportunity.compensation && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted tabular-nums">
            <Coins className="size-3.5" />
            {opportunity.compensation}
          </span>
        )}
        {opportunity.location && (
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <MapPin className="size-3.5" />
            {opportunity.location}
          </span>
        )}
      </div>

      {opportunity.nextActionAt && (
        <div className="flex items-center">
          <DueBadge date={opportunity.nextActionAt} />
        </div>
      )}
    </Link>
  )
}
