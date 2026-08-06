import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, HeartHandshake, RefreshCw, Sparkles, UserPlus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

const PHASES = {
  onboarding: { label: 'Onboarding', detail: 'Réussir les premières actions.', icon: UserPlus },
  satisfaction: { label: 'Satisfaction', detail: 'Recueillir le retour au bon moment.', icon: HeartHandshake },
  renewal: { label: 'Renouvellement', detail: 'Préparer la prochaine échéance.', icon: RefreshCw },
  upsell: { label: 'Upsell et réactivation', detail: 'Détecter le prochain levier.', icon: Sparkles },
} as const

export function GrowthPanel() {
  const clients = useQuery(api.domain.growth.clientCycle)
  if (!clients) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>
  if (clients.length === 0) return <section className="border border-dashed border-border px-6 py-14 text-center"><HeartHandshake className="mx-auto size-7 text-fg-subtle" /><h2 className="mt-4 text-balance font-semibold text-fg">Aucun cycle client actif</h2><p className="mx-auto mt-2 max-w-md text-pretty text-sm text-fg-muted">Un closing réussi devient automatiquement un client à onboarder, satisfaire puis développer.</p><Button className="mt-5" asChild><Link to="/app/deals">Voir les deals</Link></Button></section>

  return <section className="divide-y divide-border border border-border bg-surface" aria-label="Cycle client">{clients.map((client) => { const phase = PHASES[client.phase as keyof typeof PHASES] ?? PHASES.upsell; const Icon = phase.icon; return <article key={client.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(13rem,0.7fr)_auto] sm:items-center sm:px-5"><span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent"><Icon className="size-4" /></span><div><p className="font-medium text-fg">{client.title}</p><p className="mt-1 text-sm text-fg-muted">{phase.label} · {phase.detail}</p></div><p className="text-pretty text-xs text-fg-muted">{client.signals.join(' · ')}</p><Button variant="ghost" size="icon" aria-label={`Ouvrir ${client.title}`}><ArrowUpRight /></Button></article> })}</section>
}
