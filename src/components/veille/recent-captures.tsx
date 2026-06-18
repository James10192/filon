import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'
import { STAGE_META, type Stage } from '~/components/opportunities/meta'
import { formatRelativeTime } from './meta'
import { m } from '~/lib/paraglide/messages'

/**
 * Captures récentes : le lien entre une offre détectée par la veille et son
 * devenir dans le pipeline. Entonnoir compact (captées / en cours / gagnées)
 * puis la liste des dernières captures avec leur stade actuel. États gérés :
 * chargement (skeletons), vide, liste.
 */
export function RecentCaptures() {
  const data = useQuery(api.veille.monitor.recentCaptures, { limit: 8 })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{m.veille_captures_title()}</CardTitle>
            <CardDescription>
              {m.veille_captures_desc()}
            </CardDescription>
          </div>
          {data && <Funnel funnel={data.funnel} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {data === undefined ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState />
        ) : (
          data.items.map((item) => (
            <CaptureRow key={item._id} item={item} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

type CaptureItem = {
  _id: Id<'opportunities'>
  title: string
  source?: string
  stage: string
  intent: string
  importedAt?: number
  createdAt: number
}

function CaptureRow({ item }: { item: CaptureItem }) {
  const meta = STAGE_META[item.stage as Stage]
  return (
    <Link
      to="/app/opportunites/$id"
      params={{ id: item._id }}
      search={{ view: 'liste' }}
      className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
    >
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-fg">{item.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
          {item.source && <span>{item.source}</span>}
          {item.source && <span aria-hidden>·</span>}
          <span>{formatRelativeTime(item.importedAt ?? item.createdAt)}</span>
        </div>
      </div>
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium',
          meta ? meta.chip : 'bg-surface-2 text-fg-muted',
        )}
      >
        {meta ? meta.short : item.stage}
      </span>
    </Link>
  )
}

/** Entonnoir compact : chiffres tabulaires, accent sur les gagnées. */
function Funnel({
  funnel,
}: {
  funnel: { captured: number; active: number; won: number; lost: number }
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-fg-muted">
      <FunnelStat value={funnel.captured} label={m.veille_funnel_captured()} />
      <span aria-hidden className="text-border">
        |
      </span>
      <FunnelStat value={funnel.active} label={m.veille_funnel_active()} />
      <span aria-hidden className="text-border">
        |
      </span>
      <FunnelStat value={funnel.won} label={m.veille_funnel_won()} accent />
    </div>
  )
}

function FunnelStat({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent?: boolean
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          accent ? 'text-success' : 'text-fg',
        )}
      >
        {value}
      </span>
      <span>{label}</span>
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Sparkles className="size-6" />
      </span>
      <div className="max-w-xs space-y-1">
        <p className="text-sm font-medium text-fg">
          {m.veille_captures_empty_title()}
        </p>
        <p className="text-sm leading-relaxed text-fg-muted">
          {m.veille_captures_empty_body()}
        </p>
      </div>
    </div>
  )
}
