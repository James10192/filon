import { useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import {
  Bot,
  Inbox,
  ListChecks,
  MessageSquareText,
  Sparkles,
  X,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '~/components/ui/sheet'
import { useMediaQuery } from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import {
  ConversationPanel,
  type AdminAiMessage,
} from './admin-ai-chat'
import { formatRelative } from './admin-meta'

function eventVariant(level: 'info' | 'warning' | 'error') {
  switch (level) {
    case 'info':
      return 'info' as const
    case 'warning':
      return 'warning' as const
    case 'error':
      return 'danger' as const
  }
}

export function AdminAiPanel() {
  const overview = useQuery(api.admin.aiOverview, {})
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const threadDetail = useQuery(
    api.admin.aiThreadDetail,
    selectedThreadId ? { threadId: selectedThreadId } : 'skip',
  )
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <section className="flex flex-col gap-5">
      <MetricsGrid overview={overview} />
      <EventTypes overview={overview} />

      <div className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <RecentThreads
          overview={overview}
          selectedThreadId={selectedThreadId}
          onSelect={setSelectedThreadId}
        />

        <div className="hidden lg:block">
          <Card className="h-full overflow-hidden">
            {selectedThreadId ? (
              <ThreadDetail
                detail={threadDetail ?? null}
                onClose={() => setSelectedThreadId(null)}
              />
            ) : (
              <SelectionPlaceholder />
            )}
          </Card>
        </div>
      </div>

      <RecentEvents overview={overview} />

      <Sheet
        open={selectedThreadId !== null && !isDesktop}
        onOpenChange={(open) => !open && setSelectedThreadId(null)}
      >
        <SheetContent
          side="right"
          className="w-full max-w-full gap-0 p-0 [&>button:last-child]:hidden"
        >
          <SheetTitle className="sr-only">Conversation IA</SheetTitle>
          <SheetDescription className="sr-only">
            Détail conversation IA
          </SheetDescription>
          <ThreadDetail
            detail={threadDetail ?? null}
            onClose={() => setSelectedThreadId(null)}
          />
        </SheetContent>
      </Sheet>
    </section>
  )
}

function MetricsGrid({ overview }: { overview: any }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {overview === undefined ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
        ))
      ) : (
        <>
          <MetricCard
            title="Fils IA"
            value={overview.totals.threads.toLocaleString('fr-FR')}
            icon={<MessageSquareText className="size-4" />}
          />
          <MetricCard
            title="Actions IA"
            value={overview.totals.actions.toLocaleString('fr-FR')}
            icon={<ListChecks className="size-4" />}
          />
          <MetricCard
            title="Échecs IA"
            value={overview.totals.failures.toLocaleString('fr-FR')}
            icon={<Bot className="size-4" />}
            danger
          />
          <MetricCard
            title="Crédits du mois"
            value={overview.totals.credits.toLocaleString('fr-FR')}
            icon={<Sparkles className="size-4" />}
          />
        </>
      )}
    </div>
  )
}

function EventTypes({ overview }: { overview: any }) {
  if (!overview || overview.byType.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Événements IA les plus fréquents
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {overview.byType.map((item: any) => (
          <Badge key={item.type} variant="outline">
            {item.type} · {item.count}
          </Badge>
        ))}
      </CardContent>
    </Card>
  )
}

function RecentThreads({
  overview,
  selectedThreadId,
  onSelect,
}: {
  overview: any
  selectedThreadId: string | null
  onSelect: (threadId: string) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm">Conversations récentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {overview === undefined ? (
          <ListSkeleton />
        ) : overview.recentThreads.length === 0 ? (
          <EmptyState
            title="Aucune conversation"
            body="Les fils du copilote apparaîtront ici."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {overview.recentThreads.map((thread: any) => (
              <li key={thread.threadId}>
                <button
                  type="button"
                  onClick={() => onSelect(thread.threadId)}
                  className={cn(
                    'flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-2',
                    thread.threadId === selectedThreadId && 'bg-surface-2',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 text-sm font-medium text-fg">
                      {thread.title}
                    </span>
                    <span className="ml-auto text-xs text-fg-subtle">
                      {formatRelative(thread.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-fg-subtle">
                    {thread.userName ?? thread.userEmail}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ThreadDetail({
  detail,
  onClose,
}: {
  detail: any
  onClose: () => void
}) {
  if (!detail) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center p-6">
        <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-fg">
            {detail.thread.title}
          </h3>
          <p className="text-sm text-fg-muted">
            {detail.thread.userName ?? detail.thread.userEmail}
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

      <div className="grid gap-5 overflow-y-auto px-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <ConversationPanel
          messages={detail.messages as AdminAiMessage[]}
          emptyState={
            <EmptyState
              title="Aucun message"
              body="Ce fil ne contient pas encore de contenu lisible."
            />
          }
        />

        <div className="space-y-5">
          <EventsPanel events={detail.events} />
          <ActionsPanel actions={detail.actions} />
        </div>
      </div>
    </div>
  )
}

function RecentEvents({ overview }: { overview: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Événements IA récents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview === undefined ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-[var(--radius)]" />
          ))
        ) : overview.recentEvents.length === 0 ? (
          <EmptyState
            title="Aucun événement"
            body="Les exécutions et erreurs du copilote apparaîtront ici."
          />
        ) : (
          overview.recentEvents.slice(0, 12).map((event: any) => (
            <div
              key={event._id}
              className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={eventVariant(event.level)}>{event.level}</Badge>
                <Badge variant="outline">{event.type}</Badge>
                {event.tool && <Badge variant="outline">{event.tool}</Badge>}
                <span className="ml-auto text-xs text-fg-subtle">
                  {formatRelative(event.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-fg">{event.message}</p>
              <p className="mt-1 text-xs text-fg-subtle">
                {event.userName ?? event.userEmail}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function EventsPanel({ events }: { events: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Événements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <EmptyState
            title="Aucun événement"
            body="Ce fil n’a pas encore produit de journal d’exécution."
          />
        ) : (
          events.map((event) => (
            <div
              key={event._id}
              className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <Badge variant={eventVariant(event.level)}>{event.level}</Badge>
                <Badge variant="outline">{event.type}</Badge>
                <span className="ml-auto text-xs text-fg-subtle">
                  {formatRelative(event.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-fg">{event.message}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function ActionsPanel({ actions }: { actions: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Actions exécutées</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 ? (
          <EmptyState
            title="Aucune action"
            body="Ce fil n’a pas encore produit d’écriture métier."
          />
        ) : (
          actions.map((action) => (
            <div
              key={action._id}
              className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline">{action.tool}</Badge>
                <span className="ml-auto text-xs text-fg-subtle">
                  {formatRelative(action.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-fg">{action.summary}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({
  title,
  value,
  icon,
  danger = false,
}: {
  title: string
  value: string
  icon: ReactNode
  danger?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1.5">
          <p className="eyebrow">{title}</p>
          <p
            className={cn(
              'assay text-2xl font-semibold',
              danger ? 'text-danger' : 'text-fg',
            )}
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-[var(--radius)]',
            danger ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent',
          )}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-subtle">
        <Inbox className="size-5" />
      </span>
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="max-w-xs text-sm text-fg-muted">{body}</p>
    </div>
  )
}

function SelectionPlaceholder() {
  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-accent">
        <MessageSquareText className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">
          Sélectionne une conversation
        </p>
        <p className="max-w-xs text-sm text-fg-muted">
          Le détail s’affichera ici avec les messages, les événements et les actions.
        </p>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-2 px-4 py-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
