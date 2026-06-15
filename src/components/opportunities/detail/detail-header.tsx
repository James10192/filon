import type { FunctionReturnType } from 'convex/server'
import {
  ExternalLink,
  Pencil,
  MapPin,
  Coins,
  CalendarClock,
} from 'lucide-react'
import type { api } from '../../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { AskCopilotButton } from '~/components/copilot/ask-copilot-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { StageChip, TypeChip } from '../chips'
import { STAGES, STAGE_META, formatDate, type Stage } from '../meta'
import { DeleteOpportunityDialog } from './panels'

type LoadedOpportunity = FunctionReturnType<typeof api.opportunities.get>

/** En-tête du détail : type / étape, intitulé, méta, tags, sélecteur d'étape. */
export function DetailHeader({
  opportunity,
  removing,
  onEdit,
  onRemove,
  onStage,
}: {
  opportunity: LoadedOpportunity
  removing: boolean
  onEdit: () => void
  onRemove: () => void
  onStage: (next: Stage) => void
}) {
  const companyName = opportunity.company?.name
  const seed = companyName
    ? m.copilot_seed_opportunity({
        title: opportunity.title,
        company: companyName,
      })
    : m.copilot_seed_opportunity_no_company({ title: opportunity.title })

  return (
    <header className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TypeChip type={opportunity.type} />
          <StageChip stage={opportunity.stage} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <AskCopilotButton seed={seed} variant="icon" />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Modifier"
            title="Modifier"
            className="size-9 p-0"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <DeleteOpportunityDialog onConfirm={onRemove} pending={removing} />
        </div>
      </div>
      <h1 className="text-xl font-semibold tracking-[-0.02em] text-fg">
        {opportunity.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
        {opportunity.compensation && (
          <span className="assay inline-flex items-center gap-1.5">
            <Coins className="size-4 text-fg-subtle" />
            {opportunity.compensation}
          </span>
        )}
        {opportunity.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-fg-subtle" />
            {opportunity.location}
          </span>
        )}
        {opportunity.source && (
          <span className="inline-flex items-center gap-1.5">
            Source : {opportunity.source}
          </span>
        )}
        {opportunity.deadline && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-fg-subtle" />
            Échéance{' '}
            <span className="assay">{formatDate(opportunity.deadline)}</span>
          </span>
        )}
        {opportunity.url && (
          <a
            href={opportunity.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
          >
            <ExternalLink className="size-4" />
            Voir l'offre
          </a>
        )}
      </div>

      {opportunity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opportunity.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex h-6 items-center rounded-md bg-surface-2 px-2 text-xs font-medium text-fg-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-3">
        <Label className="text-xs uppercase tracking-wide text-fg-subtle">
          Étape
        </Label>
        <Select
          value={opportunity.stage}
          onValueChange={(v) => onStage(v as Stage)}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  )
}
