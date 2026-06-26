import { Fragment, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  Target,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  BellRing,
  Hourglass,
  CalendarOff,
  Compass,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Suggestion, SuggestionKind } from '../../../convex/suggestions'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Card } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ProgressBar } from '~/components/ui/progress-bar'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { toast } from '~/components/ui/sonner'
import { AskCopilotButton } from '~/components/copilot/ask-copilot-button'
import { useLensSet } from '~/components/opportunities/use-stage-labels'

/**
 * Bandeau de pilotage : consolide en UNE seule bande compacte les trois surfaces
 * d'orientation du tableau de bord (radar de regret, suggestions du jour,
 * objectif de palier) qui, empilées en grandes cartes, repoussaient les KPI sous
 * la ligne de flottaison. Chaque signal devient une cellule d'une ligne ; le
 * détail riche (liste des suggestions, édition d'objectif) part dans un Popover /
 * Dialog au lieu d'occuper de la hauteur. Rien ne s'affiche s'il n'y a rien à
 * signaler (anti-clutter) : dans ce cas les chiffres remontent tout en haut.
 */
export function DashboardBanner() {
  const radar = useQuery(api.conversion.radar.get, {})
  const suggestions = useQuery(api.suggestions.today, {})
  const lens = useLensSet()
  const rank = useQuery(api.mlm.rankProgress, {}) as
    | RankProgress
    | null
    | undefined

  const cells: { key: string; node: ReactNode }[] = []

  if (radar && radar.visible) {
    cells.push({ key: 'radar', node: <RadarCell radar={radar} /> })
  }
  if (suggestions && suggestions.length > 0) {
    cells.push({
      key: 'suggestions',
      node: <SuggestionsCell suggestions={suggestions} />,
    })
  }
  if (lens === 'vente' && rank) {
    cells.push({ key: 'goal', node: <GoalCell data={rank} /> })
  }

  if (cells.length === 0) return null

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {cells.map((cell, i) => (
          <Fragment key={cell.key}>
            {i > 0 && (
              <>
                <Separator className="sm:hidden" />
                <Separator orientation="vertical" className="hidden sm:block" />
              </>
            )}
            {cell.node}
          </Fragment>
        ))}
      </div>
    </Card>
  )
}

/** Coquille d'une cellule du bandeau : pastille + libellés sur une ligne + action. */
function Cell({
  tone,
  icon,
  eyebrow,
  title,
  sub,
  children,
  action,
}: {
  tone: string
  icon: ReactNode
  eyebrow: string
  title: ReactNode
  sub?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 p-3.5 md:p-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)]',
          tone,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
          {eyebrow}
        </p>
        <p className="truncate text-sm font-semibold tracking-[-0.01em] text-fg">
          {title}
        </p>
        {sub && <p className="truncate text-xs text-fg-muted">{sub}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ------------------------------- Radar ------------------------------- */

type RadarData = {
  lens: 'emploi' | 'vente' | 'recrutement'
  total: number
  counts: { opps: number; followups: number; network: number }
}

function radarLead(lens: RadarData['lens'], total: number): string {
  if (lens === 'vente') return m.radar_lead_vente({ count: total })
  if (lens === 'recrutement') return m.radar_lead_recrutement({ count: total })
  return m.radar_lead_emploi({ count: total })
}

function RadarCell({ radar }: { radar: RadarData }) {
  const { counts } = radar
  const parts: string[] = []
  if (counts.opps > 0) parts.push(m.radar_part_opps({ n: counts.opps }))
  if (counts.followups > 0)
    parts.push(m.radar_part_followups({ n: counts.followups }))
  if (counts.network > 0) parts.push(m.radar_part_network({ n: counts.network }))

  return (
    <Cell
      tone="bg-accent-soft text-accent"
      icon={<Target className="size-[18px]" />}
      eyebrow={m.radar_title()}
      title={radarLead(radar.lens, radar.total)}
      sub={parts.length > 0 ? parts.join(' · ') : undefined}
      action={
        <AskCopilotButton
          seed={m.radar_seed()}
          label={m.radar_cta()}
          size="sm"
          buttonVariant="default"
        />
      }
    />
  )
}

/* ---------------------------- Suggestions ---------------------------- */

/** Présentation par type de suggestion : icône + libellés + seed copilote. */
function present(s: Suggestion): {
  icon: LucideIcon
  title: string
  desc: string
  seed: string
} {
  const c = { count: s.count }
  switch (s.kind) {
    case 'overdue_followups':
      return {
        icon: BellRing,
        title: m.suggestions_overdue_title(c),
        desc: m.suggestions_overdue_desc(),
        seed: m.suggestions_overdue_seed(c),
      }
    case 'stale_opportunities':
      return {
        icon: Hourglass,
        title: m.suggestions_stale_title(c),
        desc: m.suggestions_stale_desc({ days: s.days ?? 10 }),
        seed: m.suggestions_stale_seed({ count: s.count, days: s.days ?? 10 }),
      }
    case 'no_next_action':
      return {
        icon: CalendarOff,
        title: m.suggestions_noaction_title(c),
        desc: m.suggestions_noaction_desc(),
        seed: m.suggestions_noaction_seed(c),
      }
    case 'empty_pipeline':
      return {
        icon: Compass,
        title: m.suggestions_empty_pipeline_title(),
        desc: m.suggestions_empty_pipeline_desc(),
        seed: m.suggestions_empty_pipeline_seed(),
      }
  }
}

const SUGGESTION_TONE: Record<SuggestionKind, string> = {
  overdue_followups: 'text-danger bg-danger-soft',
  stale_opportunities: 'text-warning bg-warning-soft',
  no_next_action: 'text-accent bg-accent/10',
  empty_pipeline: 'text-accent bg-accent/10',
}

function SuggestionsCell({ suggestions }: { suggestions: Suggestion[] }) {
  const top = present(suggestions[0])
  return (
    <Cell
      tone="bg-accent/10 text-accent"
      icon={<Sparkles className="size-[18px]" />}
      eyebrow={m.suggestions_title()}
      title={top.title}
      sub={suggestions.length > 1 ? top.desc : undefined}
      action={
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label={m.suggestions_title()}
            >
              <span className="tabular-nums">{suggestions.length}</span>
              <ChevronRight className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-2">
            <p className="px-1.5 pb-1.5 pt-1 text-xs text-fg-subtle">
              {m.suggestions_subtitle()}
            </p>
            <ul className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <SuggestionRow key={s.kind} suggestion={s} />
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      }
    />
  )
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const { icon: Icon, title, desc, seed } = present(suggestion)
  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-2.5">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
            SUGGESTION_TONE[suggestion.kind],
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold leading-snug text-fg">{title}</p>
          <p className="text-xs leading-snug text-fg-muted">{desc}</p>
        </div>
      </div>
      <AskCopilotButton
        seed={seed}
        size="sm"
        buttonVariant="outline"
        className="w-full justify-center"
        ariaLabel={m.suggestions_ask_aria({ label: title })}
      />
    </li>
  )
}

/* ------------------------------- Objectif ------------------------------ */

type RankProgress = {
  goalLabel: string | null
  target: number | null
  activeCount: number
  atRiskCount: number
  remaining: number | null
  inFlight: number
  focus: { id: string; title: string; stage: string }[]
}

function GoalCell({ data }: { data: RankProgress }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const hasGoal = data.target !== null

  const target = data.target ?? 0
  const pct = target > 0 ? Math.min(100, (data.activeCount / target) * 100) : 0
  const reached = data.remaining === 0

  return (
    <>
      {hasGoal ? (
        <Cell
          tone="bg-accent text-white"
          icon={<Target className="size-[18px]" />}
          eyebrow={m.rank_goal_title()}
          title={
            <span className="tabular-nums">
              {data.activeCount} / {target}
            </span>
          }
          sub={
            reached
              ? m.rank_goal_reached({ label: data.goalLabel ?? '' })
              : m.rank_goal_remaining({
                  n: data.remaining ?? 0,
                  label: data.goalLabel ?? '',
                })
          }
          action={
            <Button
              variant="outline"
              size="sm"
              aria-label={m.rank_goal_title()}
              onClick={() => {
                setEditing(false)
                setOpen(true)
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          }
        >
          <ProgressBar
            percent={pct}
            className="mt-1.5"
            barClassName={reached ? 'bg-success' : undefined}
          />
        </Cell>
      ) : (
        <Cell
          tone="bg-accent-soft text-accent"
          icon={<Target className="size-[18px]" />}
          eyebrow={m.rank_goal_title()}
          title={m.rank_goal_hint()}
          action={
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditing(true)
                setOpen(true)
              }}
            >
              {m.rank_goal_define_cta()}
            </Button>
          }
        />
      )}

      <GoalDialog
        open={open}
        onOpenChange={setOpen}
        data={data}
        editing={editing}
        setEditing={setEditing}
      />
    </>
  )
}

function GoalDialog({
  open,
  onOpenChange,
  data,
  editing,
  setEditing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  data: RankProgress
  editing: boolean
  setEditing: (v: boolean) => void
}) {
  const setGoal = useMutation(api.mlm.setRankGoal)
  const target = data.target ?? 0
  const reached = data.remaining === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-5 text-accent" />
            {m.rank_goal_title()}
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <GoalForm
            initialLabel={data.goalLabel ?? ''}
            initialTarget={data.target ?? undefined}
            onCancel={() => (data.target === null ? onOpenChange(false) : setEditing(false))}
            onSave={async (label, t) => {
              await setGoal({ label, targetActives: t })
              setEditing(false)
              toast.success(m.rank_goal_save())
            }}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg-muted">
                  {m.rank_goal_progress_label()}
                </span>
                <span className="text-sm font-semibold tabular-nums text-fg">
                  {data.activeCount} / {target}
                </span>
              </div>
              <ProgressBar
                percent={target > 0 ? Math.min(100, (data.activeCount / target) * 100) : 0}
                className="mt-2 h-2.5"
                barClassName={reached ? 'bg-success' : undefined}
              />
              <p
                className={cn(
                  'mt-2 text-sm font-medium',
                  reached ? 'text-success' : 'text-fg',
                )}
              >
                {reached
                  ? m.rank_goal_reached({ label: data.goalLabel ?? '' })
                  : m.rank_goal_remaining({
                      n: data.remaining ?? 0,
                      label: data.goalLabel ?? '',
                    })}
              </p>
              {data.atRiskCount > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
                  <AlertTriangle className="size-3.5" />
                  {m.rank_goal_atrisk({ n: data.atRiskCount })}
                </p>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
                <TrendingUp className="size-4 text-accent" />
                {m.rank_goal_focus_title()}
              </div>
              {data.focus.length === 0 ? (
                <p className="mt-2 text-sm text-fg-muted">
                  {m.rank_goal_focus_empty()}
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {data.focus.map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/app/opportunites"
                        search={{ view: 'liste' }}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center justify-between gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                      >
                        <span className="truncate">{o.title}</span>
                        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                {m.rank_goal_edit()}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GoalForm({
  initialLabel,
  initialTarget,
  onSave,
  onCancel,
}: {
  initialLabel: string
  initialTarget?: number
  onSave: (label: string, target: number) => Promise<void>
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initialLabel)
  const [target, setTarget] = useState(initialTarget ? String(initialTarget) : '')
  const [saving, setSaving] = useState(false)

  const targetNum = Number(target)
  const valid = label.trim().length > 0 && targetNum > 0

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || saving) return
        setSaving(true)
        try {
          await onSave(label.trim(), Math.floor(targetNum))
        } finally {
          setSaving(false)
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rank-label">{m.rank_goal_label_field()}</Label>
        <Input
          id="rank-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={m.rank_goal_label_placeholder()}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rank-target">{m.rank_goal_target_field()}</Label>
        <Input
          id="rank-target"
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {m.rank_goal_cancel()}
        </Button>
        <Button type="submit" disabled={!valid || saving}>
          {m.rank_goal_save()}
        </Button>
      </div>
    </form>
  )
}
