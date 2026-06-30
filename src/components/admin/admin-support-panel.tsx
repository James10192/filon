import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Inbox, Loader2, LifeBuoy, Send, UserRound } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'

type Status = 'pending' | 'active' | 'released' | 'dismissed' | 'all'

export function AdminSupportPanel() {
  const [filter, setFilter] = useState<Status>('pending')
  const [selectedId, setSelectedId] = useState<Id<'supportThreads'> | null>(null)
  const items = useQuery(
    api.support.supportInbox,
    filter === 'all' ? {} : { status: filter },
  )

  useEffect(() => {
    if (!selectedId || !items) return
    if (!items.some((item) => item.thread._id === selectedId)) setSelectedId(null)
  }, [items, selectedId])

  return (
    <section className="grid gap-5 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Inbox support</CardTitle>
            <div className="flex gap-2">
              {(['pending', 'active', 'released', 'dismissed', 'all'] as Status[]).map(
                (status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={filter === status ? 'default' : 'outline'}
                    onClick={() => setFilter(status)}
                  >
                    {statusLabel(status)}
                  </Button>
                ),
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items === undefined ? (
            <ListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.thread._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.thread._id)}
                    className="flex min-h-11 w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-2">
                      <LifeBuoy className="size-4 text-accent" />
                      <span className="truncate text-sm font-medium text-fg">
                        {item.user.name?.trim() || item.user.email}
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {statusLabel(item.thread.status)}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-fg-muted">
                      {item.preview}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedId ? (
        <AdminSupportDetail supportThreadId={selectedId} />
      ) : (
        <Card>
          <CardContent className="flex min-h-[24rem] items-center justify-center">
            <p className="text-sm text-fg-muted">
              Sélectionnez un fil support pour le traiter.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function AdminSupportDetail({
  supportThreadId,
}: {
  supportThreadId: Id<'supportThreads'>
}) {
  const detail = useQuery(api.support.supportAdminThread, { supportThreadId })
  const takeOver = useMutation(api.support.supportTakeOver)
  const release = useMutation(api.support.supportRelease)
  const dismiss = useMutation(api.support.supportDismiss)
  const send = useMutation(api.support.supportAgentSend)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  if (detail === undefined) {
    return <Skeleton className="h-[32rem] rounded-[var(--radius-lg)]" />
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true)
    try {
      await action()
      toast.success(success)
    } finally {
      setSaving(false)
    }
  }

  async function sendMessage() {
    const body = draft.trim()
    if (!body) return
    await run(
      () => send({ supportThreadId, body }),
      'Message agent envoyé.',
    )
    setDraft('')
  }

  return (
    <Card className="min-h-[32rem]">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">
              {detail.user.name?.trim() || detail.user.email}
            </CardTitle>
            <p className="mt-1 text-xs text-fg-muted">
              {detail.thread.assistantKind} · {statusLabel(detail.thread.status)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => run(() => takeOver({ supportThreadId }), 'Fil pris en charge.')}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
              Prendre
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => run(() => release({ supportThreadId }), 'Reprise IA envoyée.')}
            >
              Rendre a l'IA
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => run(() => dismiss({ supportThreadId }), 'Fil clôturé.')}
            >
              Clore
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          {detail.messages.map((message) => (
            <div
              key={message._id}
              className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-2"
            >
              <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                {message.role === 'agent'
                  ? message.actorName ?? 'Agent'
                  : message.role === 'system'
                    ? 'Systeme'
                    : 'Client'}
              </p>
              <p className="whitespace-pre-wrap text-sm text-fg">{message.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Réponse agent"
          />
          <Button type="button" onClick={sendMessage} disabled={saving || !draft.trim()}>
            <Send className="size-4" />
            Envoyer
          </Button>
        </div>
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
      <p className="text-sm font-medium text-fg">Aucun fil support</p>
      <p className="max-w-xs text-sm text-fg-muted">
        Les demandes de relais humain apparaitront ici.
      </p>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-[var(--radius)]" />
      ))}
    </div>
  )
}

function statusLabel(status: Status): string {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'active':
      return 'Actif'
    case 'released':
      return 'Repris'
    case 'dismissed':
      return 'Clos'
    case 'all':
      return 'Tous'
  }
}
