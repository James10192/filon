import { MapPin, Coins, Radio } from 'lucide-react'
import {
  StageChip,
  TypeChip,
  DueBadge,
  TargetChip,
  TagChips,
  FlagBadge,
  sourceLabel,
} from './chips'
import type { EnrichedOpportunity } from './types'

/** Carte d'opportunité (vue liste / grille mobile). Clic -> sélection. */
export function OpportunityCard({
  opportunity,
  onSelect,
}: {
  opportunity: EnrichedOpportunity
  onSelect: () => void
}) {
  const targetName = opportunity.companyName ?? opportunity.contactName
  const source = sourceLabel(
    opportunity.sourceChannel,
    opportunity.sourceDetail,
    opportunity.source,
  )
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-[var(--shadow-pop)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-fg">
          {opportunity.title}
        </h3>
        <StageChip stage={opportunity.stage} compact />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {opportunity.flaggedPriority && (
          <FlagBadge byName={opportunity.flaggedByName} />
        )}
        <TypeChip type={opportunity.type} />
        {targetName && (
          <TargetChip
            targetType={opportunity.effectiveTargetType}
            name={targetName}
          />
        )}
        {opportunity.compensation && (
          <span className="assay inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted">
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
        {source && (
          <span
            className="inline-flex max-w-full items-center gap-1.5 text-xs text-fg-subtle"
            title={source}
          >
            <Radio className="size-3.5 shrink-0" />
            <span className="truncate">{source}</span>
          </span>
        )}
      </div>

      <TagChips tags={opportunity.tags} max={4} />

      {opportunity.nextActionAt && (
        <div className="flex items-center">
          <DueBadge date={opportunity.nextActionAt} />
        </div>
      )}
    </button>
  )
}
