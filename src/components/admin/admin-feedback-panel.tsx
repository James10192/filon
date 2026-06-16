import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Inbox } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_STATUS_ORDER,
  formatNumber,
  type FeedbackStatus,
} from './admin-meta'
import { AdminFeedbackItem, type FeedbackEntry } from './admin-feedback-item'

type Filter = FeedbackStatus | 'all'

/**
 * Section « Feedbacks » du back-office : boîte de réception triée (récents
 * d'abord, côté serveur), filtre par statut. Lit `api.admin.listFeedback`.
 */
export function AdminFeedbackPanel() {
  const [filter, setFilter] = useState<Filter>('all')
  const items = useQuery(
    api.admin.listFeedback,
    filter === 'all' ? {} : { status: filter },
  ) as FeedbackEntry[] | undefined

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {items
            ? `${formatNumber(items.length)} retour${items.length > 1 ? 's' : ''}, récents d'abord.`
            : 'Chargement des retours.'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-fg-muted">Statut</span>
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as Filter)}
          >
            <SelectTrigger
              className="h-11 w-44"
              aria-label="Filtrer par statut"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {FEEDBACK_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {FEEDBACK_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {items === undefined ? (
        <FeedbackSkeleton />
      ) : items.length === 0 ? (
        <EmptyFeedback filtered={filter !== 'all'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <AdminFeedbackItem key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyFeedback({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <Inbox className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">
        {filtered ? 'Aucun retour pour ce statut' : 'Aucun retour'}
      </p>
      <p className="max-w-xs text-sm text-fg-muted">
        {filtered
          ? 'Aucun retour ne correspond à ce filtre.'
          : 'Les retours envoyés par les utilisateurs apparaîtront ici.'}
      </p>
    </div>
  )
}

function FeedbackSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-14 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-11 w-44 rounded-[var(--radius)]" />
        </div>
      ))}
    </div>
  )
}
