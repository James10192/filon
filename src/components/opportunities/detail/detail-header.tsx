import type { FunctionReturnType } from 'convex/server'
import {
  ExternalLink,
  FileText,
  Pencil,
  MapPin,
  Coins,
  CalendarClock,
  Radio,
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
import { StageChip, TypeChip, TargetChip, sourceLabel } from '../chips'
import {
  PRIORITY_META,
  STAGES,
  formatDate,
  type Priority,
  type Stage,
} from '../meta'
import { useStageLabels } from '../use-stage-labels'

const PRIORITIES: Priority[] = ['high', 'medium', 'low']
import { DeleteOpportunityDialog } from './panels'

type LoadedOpportunity = FunctionReturnType<typeof api.opportunities.get>

/** En-tête du détail : type / étape, intitulé, méta, tags, sélecteur d'étape. */
export function DetailHeader({
  opportunity,
  removing,
  onEdit,
  onRemove,
  onCreateDocument,
  onStage,
  onPriority,
}: {
  opportunity: LoadedOpportunity
  removing: boolean
  onEdit: () => void
  onRemove: () => void
  onCreateDocument: () => void
  onStage: (next: Stage) => void
  onPriority: (next: Priority) => void
}) {
  const { label: stageLabelOf } = useStageLabels()
  const companyName = opportunity.company?.name
  const targetName = opportunity.companyName ?? opportunity.contactName
  const source = sourceLabel(
    opportunity.sourceChannel,
    opportunity.sourceDetail,
    opportunity.source,
  )
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
          <TargetChip
            targetType={opportunity.effectiveTargetType}
            name={targetName}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <AskCopilotButton seed={seed} variant="icon" />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Créer un document"
            title="Créer un document"
            className="size-11 p-0 sm:size-9"
            onClick={onCreateDocument}
          >
            <FileText className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={m.opp_action_edit()}
            title={m.opp_action_edit()}
            className="size-11 p-0 sm:size-9"
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
        {source && (
          <span className="inline-flex items-center gap-1.5">
            <Radio className="size-4 text-fg-subtle" />
            {source}
          </span>
        )}
        {opportunity.deadline && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-fg-subtle" />
            {m.opp_deadline_prefix()}{' '}
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
            {m.opp_view_offer()}
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

      <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wide text-fg-subtle">
            {m.opp_col_stage()}
          </Label>
          <Select
            value={opportunity.stage}
            onValueChange={(v) => onStage(v as Stage)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {stageLabelOf(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wide text-fg-subtle">
            {m.opp_col_priority()}
          </Label>
          <Select
            value={opportunity.priority}
            onValueChange={(v) => onPriority(v as Priority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  )
}
