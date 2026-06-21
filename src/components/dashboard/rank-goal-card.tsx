import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Target, TrendingUp, AlertTriangle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { toast } from '~/components/ui/sonner'
import { useLensSet } from '~/components/opportunities/use-stage-labels'
import { cn } from '~/lib/utils'

type Progress = {
  goalLabel: string | null
  target: number | null
  activeCount: number
  atRiskCount: number
  remaining: number | null
  inFlight: number
  focus: { id: string; title: string; stage: string }[]
}

/**
 * Carte « Objectif de palier » du dashboard (wedge MLM). Visible pour le persona
 * vente/ambassadeur uniquement. Transforme le rang (affiche par l'app de
 * l'entreprise) en plan d'action : progression DERIVEE du reseau + liste focus
 * des prochains actifs a aller chercher. Ne recopie aucun chiffre de l'entreprise.
 */
export function RankGoalCard() {
  const lens = useLensSet()
  const data = useQuery(api.mlm.rankProgress, {}) as
    | Progress
    | null
    | undefined

  // Reserve a l'ambassadeur (persona vente). Les autres metiers ne le voient pas.
  if (lens !== 'vente') return null
  if (data === undefined || data === null) return null

  return <RankGoalInner data={data} />
}

function RankGoalInner({ data }: { data: Progress }) {
  const setGoal = useMutation(api.mlm.setRankGoal)
  const hasGoal = data.target !== null
  const [editing, setEditing] = useState(false)

  if (!hasGoal && !editing) {
    return (
      <Card>
        <Header onEdit={() => setEditing(true)} editLabel={m.rank_goal_define_cta()} />
        <p className="text-sm text-fg-muted">{m.rank_goal_hint()}</p>
      </Card>
    )
  }

  if (editing) {
    return (
      <Card>
        <GoalForm
          initialLabel={data.goalLabel ?? ''}
          initialTarget={data.target ?? undefined}
          onCancel={() => setEditing(false)}
          onSave={async (label, target) => {
            await setGoal({ label, targetActives: target })
            setEditing(false)
            toast.success(m.rank_goal_save())
          }}
        />
      </Card>
    )
  }

  const target = data.target ?? 0
  const pct = target > 0 ? Math.min(100, (data.activeCount / target) * 100) : 0
  const reached = data.remaining === 0

  return (
    <Card>
      <Header onEdit={() => setEditing(true)} editLabel={m.rank_goal_edit()} />

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-fg-muted">{m.rank_goal_progress_label()}</span>
        <span className="text-sm font-semibold tabular-nums text-fg">
          {data.activeCount} / {target}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full transition-all', reached ? 'bg-success' : 'bg-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn('text-sm font-medium', reached ? 'text-success' : 'text-fg')}>
        {reached
          ? m.rank_goal_reached({ label: data.goalLabel ?? '' })
          : m.rank_goal_remaining({
              n: data.remaining ?? 0,
              label: data.goalLabel ?? '',
            })}
      </p>

      {data.atRiskCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="size-3.5" />
          {m.rank_goal_atrisk({ n: data.atRiskCount })}
        </p>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <TrendingUp className="size-4 text-accent" />
          {m.rank_goal_focus_title()}
        </div>
        {data.focus.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">{m.rank_goal_focus_empty()}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {data.focus.map((o) => (
              <li key={o.id}>
                <Link
                  to="/app/opportunites"
                  search={{ view: 'liste' }}
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
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-accent/30 bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
      {children}
    </div>
  )
}

function Header({ onEdit, editLabel }: { onEdit: () => void; editLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius)] bg-accent text-white">
          <Target className="size-5" />
        </span>
        <h2 className="text-base font-semibold tracking-[-0.015em] text-fg">
          {m.rank_goal_title()}
        </h2>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        {editLabel}
      </Button>
    </div>
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
      <div className="flex items-center gap-2">
        <Target className="size-5 text-accent" />
        <h2 className="text-base font-semibold text-fg">{m.rank_goal_title()}</h2>
      </div>
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
