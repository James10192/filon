import { useQuery } from 'convex/react'
import { Info } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { CONNECTOR_META } from '../../../convex/veille/connectors'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'
import { formatRelativeTime } from './meta'
import { m } from '~/lib/paraglide/messages'

/**
 * Santé des sources auto-surveillées. Croise CONNECTOR_META avec le suivi de
 * santé serveur (sourceHealth). Pastille opérationnel / indisponible, nombre
 * d'offres au dernier passage, et note sur les sources non automatisables.
 */
export function SourceHealthPanel() {
  const health = useQuery(api.veille.monitor.sourceHealth, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.veille_health_title()}</CardTitle>
        <CardDescription>
          {m.veille_health_desc()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {health === undefined ? (
          <div className="space-y-3">
            {CONNECTOR_META.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          CONNECTOR_META.map((connector) => {
            const entry = health.find((h) => h.connectorId === connector.id)
            return (
              <SourceRow
                key={connector.id}
                label={connector.label}
                host={connector.host}
                entry={entry}
              />
            )
          })
        )}

        <div className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-surface-2 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <p className="text-xs leading-relaxed text-fg-muted">
            {m.veille_health_note()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

type HealthEntry = {
  ok: boolean
  lastRunAt: number
  lastOkAt?: number
  lastError?: string
  lastCount?: number
}

function SourceRow({
  label,
  host,
  entry,
}: {
  label: string
  host: string
  entry?: HealthEntry
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-fg">{label}</span>
          <span className="min-w-0 truncate text-xs text-fg-subtle">{host}</span>
        </div>
        {entry ? (
          entry.lastOkAt ? (
            <p className="text-xs text-fg-muted">
              {m.veille_health_last_pass({
                n: entry.lastCount ?? 0,
                time: formatRelativeTime(entry.lastOkAt),
              })}
            </p>
          ) : entry.lastError ? (
            <p className="truncate text-xs text-fg-subtle">{entry.lastError}</p>
          ) : (
            <p className="text-xs text-fg-subtle">{m.veille_health_waiting_first()}</p>
          )
        ) : (
          <p className="text-xs text-fg-subtle">
            {m.veille_health_waiting_first()}
          </p>
        )}
      </div>

      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          entry && !entry.ok
            ? 'bg-danger-soft text-danger'
            : entry
              ? 'bg-success-soft text-success'
              : 'bg-surface-2 text-fg-subtle',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'size-1.5 rounded-full',
            entry && !entry.ok
              ? 'bg-danger'
              : entry
                ? 'bg-success'
                : 'bg-fg-subtle',
          )}
        />
        {entry
          ? entry.ok
            ? m.veille_health_operational()
            : m.veille_health_unavailable()
          : m.veille_health_pending()}
      </span>
    </div>
  )
}
