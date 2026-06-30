import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, Bug, CheckCircle2, Inbox, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '~/components/ui/sheet'
import { useMediaQuery } from '~/hooks/use-media-query'
import { formatRelative } from './admin-meta'

type IncidentLevel = 'all' | 'info' | 'warning' | 'error'

type IncidentRow = {
  _id: Id<'appErrors'>
  source: 'client' | 'server'
  feature: string
  action: string
  message: string
  level: 'info' | 'warning' | 'error'
  route?: string
  metadata?: Record<string, unknown> | null
  createdAt: number
  resolvedAt?: number
  userName?: string
  userEmail?: string
}

function levelVariant(level: 'info' | 'warning' | 'error') {
  switch (level) {
    case 'info':
      return 'info' as const
    case 'warning':
      return 'warning' as const
    case 'error':
      return 'danger' as const
  }
}

export function AdminIncidentsPanel() {
  const [level, setLevel] = useState<IncidentLevel>('all')
  const [selectedId, setSelectedId] = useState<Id<'appErrors'> | null>(null)
  const metrics = useQuery(api.admin.incidentsMetrics, {})
  const rows = useQuery(api.admin.listIncidents, { level })
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  useEffect(() => {
    if (!selectedId || !rows) return
    if (!rows.some((row) => row._id === selectedId)) setSelectedId(null)
  }, [rows, selectedId])

  return (
    <section className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {metrics === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
          ))
        ) : (
          <>
            <MetricCard
              title="Incidents ouverts"
              value={metrics.open.toLocaleString('fr-FR')}
              icon={<AlertTriangle className="size-4" />}
              accent="danger"
            />
            <MetricCard
              title="Erreurs"
              value={metrics.byLevel.error.toLocaleString('fr-FR')}
              icon={<Bug className="size-4" />}
              accent="danger"
            />
            <MetricCard
              title="Alertes"
              value={metrics.byLevel.warning.toLocaleString('fr-FR')}
              icon={<AlertTriangle className="size-4" />}
              accent="warning"
            />
            <MetricCard
              title="Informatifs"
              value={metrics.byLevel.info.toLocaleString('fr-FR')}
              icon={<CheckCircle2 className="size-4" />}
              accent="info"
            />
          </>
        )}
      </div>

      {metrics && metrics.byFeature.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fonctionnalités les plus touchées</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {metrics.byFeature.map((item) => (
              <Badge key={item.feature} variant="outline">
                {item.feature} · {item.count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {rows ? `${rows.length.toLocaleString('fr-FR')} incident(s) récents` : 'Chargement…'}
        </p>
        <Select value={level} onValueChange={(value) => setLevel(value as IncidentLevel)}>
          <SelectTrigger className="h-11 w-40" aria-label="Filtrer les incidents">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="error">Erreurs</SelectItem>
            <SelectItem value="warning">Alertes</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-5">
        <div className={selectedId ? 'w-full lg:w-96' : 'w-full'}>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
            {rows === undefined ? (
              <ListSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {rows.map((row) => (
                  <li key={row._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row._id)}
                      className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={levelVariant(row.level)}>{row.level}</Badge>
                        <Badge variant="outline">{row.feature}</Badge>
                        {row.resolvedAt && <Badge variant="success">Résolu</Badge>}
                        <span className="ml-auto text-xs text-fg-subtle">
                          {formatRelative(row.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-fg">{row.message}</p>
                      <p className="text-xs text-fg-subtle">
                        {row.userEmail ?? 'Anonyme'} · {row.action}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {selectedId && rows && (
          <aside className="sticky top-0 hidden h-[calc(100dvh-9rem)] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] lg:block">
            <IncidentDetail
              incident={rows.find((row) => row._id === selectedId) ?? null}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        )}
      </div>

      <Sheet
        open={selectedId !== null && !isDesktop}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 [&>button:last-child]:hidden"
        >
          <SheetTitle className="sr-only">Détail incident</SheetTitle>
          <SheetDescription className="sr-only">Diagnostic détaillé</SheetDescription>
          <IncidentDetail
            incident={rows?.find((row) => row._id === selectedId) ?? null}
            onClose={() => setSelectedId(null)}
          />
        </SheetContent>
      </Sheet>
    </section>
  )
}

function IncidentDetail({
  incident,
  onClose,
}: {
  incident: IncidentRow | null
  onClose: () => void
}) {
  const resolveIncident = useMutation(api.admin.resolveIncident)
  const [busy, setBusy] = useState(false)

  if (!incident) return null
  const currentIncident = incident

  async function toggleResolved(next: boolean) {
    setBusy(true)
    try {
      await resolveIncident({ id: currentIncident._id, resolved: next })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={levelVariant(currentIncident.level)}>{currentIncident.level}</Badge>
            <Badge variant="outline">{currentIncident.feature}</Badge>
            <Badge variant="outline">{currentIncident.source}</Badge>
            {currentIncident.resolvedAt && <Badge variant="success">Résolu</Badge>}
          </div>
          <h3 className="text-base font-semibold text-fg">{currentIncident.message}</h3>
          <p className="text-sm text-fg-muted">
            {currentIncident.userEmail ?? 'Utilisateur inconnu'} · {currentIncident.action}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={onClose}
          aria-label="Fermer"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contexte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-fg-muted">
            <p>Route : {currentIncident.route ?? 'n/a'}</p>
            <p>Survenu : {formatRelative(currentIncident.createdAt)}</p>
            {currentIncident.metadata && (
              <pre className="overflow-x-auto rounded-[var(--radius)] bg-surface-2 p-3 text-xs text-fg">
                {JSON.stringify(currentIncident.metadata, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant={currentIncident.resolvedAt ? 'outline' : 'default'}
            disabled={busy || currentIncident.resolvedAt !== undefined}
            onClick={() => void toggleResolved(true)}
          >
            Marquer résolu
          </Button>
          <Button
            variant="outline"
            disabled={busy || currentIncident.resolvedAt === undefined}
            onClick={() => void toggleResolved(false)}
          >
            Rouvrir
          </Button>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string
  value: string
  icon: ReactNode
  accent: 'danger' | 'warning' | 'info'
}) {
  const iconClass =
    accent === 'danger'
      ? 'bg-danger-soft text-danger'
      : accent === 'warning'
        ? 'bg-warning-soft text-warning'
        : 'bg-info-soft text-info'
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1.5">
          <p className="eyebrow">{title}</p>
          <p className="assay text-2xl font-semibold text-fg">{value}</p>
        </div>
        <span
          className={`flex size-9 items-center justify-center rounded-[var(--radius)] ${iconClass}`}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <Inbox className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">Aucun incident enregistré</p>
      <p className="max-w-xs text-sm text-fg-muted">
        Les erreurs persistées côté client et côté serveur apparaîtront ici.
      </p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </li>
      ))}
    </ul>
  )
}
