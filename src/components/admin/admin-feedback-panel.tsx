import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { Inbox } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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
import {
  feedbackStatusLabel,
  FEEDBACK_STATUS_ORDER,
  formatNumber,
  type FeedbackStatus,
} from './admin-meta'
import { m } from '~/lib/paraglide/messages'
import { AdminFeedbackItem, type FeedbackEntry } from './admin-feedback-item'
import { AdminFeedbackDetail } from './admin-feedback-detail'
import {
  AdminFeedbackMetrics,
  AdminFeedbackMetricsSkeleton,
  type FeedbackMetrics,
} from './admin-feedback-metrics'

type Filter = FeedbackStatus | 'all'

/**
 * Section « Feedbacks » du back-office : encart de pilotage (métriques) plus une
 * boîte de réception en master-detail (liste compacte à gauche, panneau détail à
 * droite ; Sheet sous `lg`). Lit `api.admin.feedbackMetrics` et
 * `api.admin.listFeedback`, le détail charge `api.admin.feedbackDetail`.
 */
export function AdminFeedbackPanel() {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<Id<'feedback'> | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const metrics = useQuery(api.admin.feedbackMetrics, {}) as
    | FeedbackMetrics
    | undefined
  const items = useQuery(
    api.admin.listFeedback,
    filter === 'all' ? {} : { status: filter },
  ) as FeedbackEntry[] | undefined

  // Si le feedback sélectionné disparaît de la liste filtrée, on referme.
  useEffect(() => {
    if (!selectedId || !items) return
    if (!items.some((i) => i._id === selectedId)) setSelectedId(null)
  }, [items, selectedId])

  const compact = selectedId !== null

  return (
    <section className="flex flex-col gap-5">
      {metrics === undefined ? (
        <AdminFeedbackMetricsSkeleton />
      ) : (
        <AdminFeedbackMetrics metrics={metrics} />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">
            {items
              ? items.length > 1
                ? m.admin_feedback_count_plural({ n: formatNumber(items.length) })
                : m.admin_feedback_count_one({ n: formatNumber(items.length) })
              : m.admin_feedback_loading()}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-fg-muted">{m.admin_feedback_status_filter()}</span>
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as Filter)}
            >
              <SelectTrigger
                className="h-11 w-44"
                aria-label={m.admin_feedback_filter_aria()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{m.admin_feedback_all_statuses()}</SelectItem>
                {FEEDBACK_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {feedbackStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-5">
          <div className={compact ? 'w-full shrink-0 lg:w-96' : 'w-full'}>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
              {items === undefined ? (
                <FeedbackListSkeleton />
              ) : items.length === 0 ? (
                <EmptyFeedback filtered={filter !== 'all'} />
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {items.map((item) => (
                    <AdminFeedbackItem
                      key={item._id}
                      item={item}
                      selected={item._id === selectedId}
                      onSelect={setSelectedId}
                      compact={compact}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Panneau détail — desktop : colonne sticky à droite. */}
          {compact && selectedId && (
            <aside className="sticky top-0 hidden h-[calc(100dvh-9rem)] flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] lg:block">
              <AdminFeedbackDetail
                key={selectedId}
                feedbackId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Panneau détail — sous `lg` : Sheet plein écran. */}
      <Sheet
        open={compact && !isDesktop}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 [&>button:last-child]:hidden"
        >
          <SheetTitle className="sr-only">
            {m.admin_feedback_sheet_title()}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {m.admin_feedback_sheet_desc()}
          </SheetDescription>
          {selectedId && (
            <AdminFeedbackDetail
              key={selectedId}
              feedbackId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

function EmptyFeedback({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <Inbox className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">
        {filtered ? m.admin_feedback_empty_filtered_title() : m.admin_feedback_empty_title()}
      </p>
      <p className="max-w-xs text-sm text-fg-muted">
        {filtered
          ? m.admin_feedback_empty_filtered_desc()
          : m.admin_feedback_empty_desc()}
      </p>
    </div>
  )
}

function FeedbackListSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </li>
      ))}
    </ul>
  )
}
