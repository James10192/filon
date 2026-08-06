import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { CheckCircle2, Clock3, MoreHorizontal, Sparkles } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'

type SelectedAction = { id: string; mode: 'ignore' | 'report' } | null

export function TodayCommandCenter() {
  const data = useQuery(api.domain.actions.today, { limit: 8 })
  const complete = useMutation(api.domain.actions.completeActionAndGenerateNext)
  const report = useMutation(api.domain.actions.reportReason)
  const ignore = useMutation(api.domain.actions.ignoreWithJustification)
  const [selected, setSelected] = useState<SelectedAction>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const nextDate = useMemo(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), [])

  if (!data) return <TodayCommandCenterSkeleton />

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id)
    setError('')
    try {
      await action()
      setSelected(null)
      setReason('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'L’action n’a pas pu être enregistrée.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface" aria-labelledby="today-priorities-title">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <div><h2 id="today-priorities-title" className="font-semibold text-fg">Priorités établies par Filon</h2><p className="mt-1 text-xs text-fg-muted">{data.counts.overdue} en retard · {data.counts.dueToday} aujourd’hui</p></div>
        <span className="assay rounded-[var(--radius-sm)] bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{data.counts.total}</span>
      </header>
      {error && <p role="alert" className="border-b border-border bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      {data.items.length === 0 ? (
        <div className="px-6 py-12 text-center"><CheckCircle2 className="mx-auto size-7 text-success" /><h3 className="mt-4 font-semibold text-fg">Rien d’urgent</h3><p className="mt-2 text-sm text-fg-muted">Filon réévaluera les priorités à la prochaine activité.</p></div>
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((item) => {
            const selectedItem = selected?.id === item.id
            return <article key={`${item.kind}-${item.id}`} className="px-4 py-4 sm:px-5"><div className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-start"><span className="assay flex size-10 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-xs font-semibold text-fg">{item.score}</span><div className="min-w-0"><p className="text-pretty text-sm font-medium text-fg">{item.title}</p><p className="mt-1 truncate text-xs text-fg-muted">{item.opportunityTitle ?? 'Action générale'} · {item.reasons.join(' · ') || 'À qualifier'}</p></div><div className="flex flex-wrap gap-2">{item.kind === 'followup' && item.opportunityId && <Button size="sm" disabled={busy === item.id} onClick={() => run(item.id, () => complete({ followupId: item.id as Id<'followups'>, opportunityId: item.opportunityId as Id<'opportunities'>, nextLabel: 'Prochaine étape à confirmer', nextDueDate: nextDate }))}><CheckCircle2 />Terminer</Button>}<Button size="icon-sm" variant="ghost" aria-label={`Plus d’actions pour ${item.title}`} onClick={() => setSelected(selectedItem ? null : { id: item.id, mode: item.kind === 'followup' ? 'ignore' : 'report' })}><MoreHorizontal /></Button></div></div>{selectedItem && <div className="mt-3 flex flex-col gap-2 rounded-[var(--radius)] bg-surface-2 p-3 sm:flex-row"><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={selected?.mode === 'ignore' ? 'Pourquoi ignorer cette priorité ?' : 'Consigner le motif ou le résultat'} /><Button variant="outline" disabled={!reason.trim() || busy === item.id} onClick={() => selected?.mode === 'ignore' ? run(item.id, () => ignore({ followupId: item.id as Id<'followups'>, justification: reason.trim() })) : item.opportunityId ? run(item.id, () => report({ opportunityId: item.opportunityId as Id<'opportunities'>, reason: reason.trim() })) : undefined}>{busy === item.id ? 'Enregistrement…' : 'Confirmer'}</Button></div>}</article>
          })}
        </div>
      )}
      <footer className="flex items-center gap-2 border-t border-border bg-surface-2/50 px-4 py-3 text-xs text-fg-muted"><Sparkles className="size-4 text-accent" />Classement recalculé selon échéance, valeur, probabilité et inactivité.</footer>
    </section>
  )
}

export function TodayCommandCenterSkeleton() {
  return <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-4"><div className="flex items-center justify-between"><Skeleton className="h-5 w-44" /><Skeleton className="size-8" /></div><div className="mt-4 space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div></section>
}
