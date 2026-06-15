import { useQuery, useMutation } from 'convex/react'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { getLocale } from '~/lib/paraglide/runtime'
import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '~/components/ui/popover'

/** Libellé relatif court i18n (ex. « il y a 2 h » / « 2 h ago »). */
function relativeTime(ms: number): string {
  const locale = getLocale()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diff = ms - Date.now()
  const min = Math.round(diff / 60000)
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  const h = Math.round(diff / 3600000)
  if (Math.abs(h) < 24) return rtf.format(h, 'hour')
  return rtf.format(Math.round(diff / 86400000), 'day')
}

/**
 * Cloche de notifications de la topbar : badge sur le nombre de non lues,
 * popover listant les notifications du user (titre, message, date relative).
 * Cliquer une notification la marque lue ; un bouton marque tout lu d'un coup.
 * Une notification avec `actionUrl` (ex. renouvellement) affiche un CTA.
 * Etats vide / chargement gérés, scope strict `userId` côté serveur.
 */
export function NotificationBell() {
  const notifications = useQuery(api.notifications.list, {})
  const unread = useQuery(api.notifications.unreadCount, {})
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  const count = unread ?? 0
  const hasUnread = count > 0

  function onItemClick(item: Doc<'notifications'>) {
    if (!item.read) void markRead({ id: item._id as Id<'notifications'> })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={m.notifications_open()}
          title={m.notifications_open()}
        >
          <Bell className="size-4 text-fg-muted" />
          {hasUnread && (
            <span
              className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-fg"
              aria-hidden
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[20rem] border-border bg-surface p-0 text-popover-foreground sm:w-[22rem]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-fg">{m.notifications_title()}</p>
          {hasUnread && (
            <button
              type="button"
              onClick={() => void markAllRead({})}
              className="flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
            >
              <CheckCheck className="size-3.5" />
              {m.notifications_mark_all_read()}
            </button>
          )}
        </div>

        <NotificationList
          notifications={notifications}
          onItemClick={onItemClick}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Liste interne : chargement (squelette), vide, ou items scrollables. */
function NotificationList({
  notifications,
  onItemClick,
}: {
  notifications: Array<Doc<'notifications'>> | undefined
  onItemClick: (item: Doc<'notifications'>) => void
}) {
  if (notifications === undefined) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="h-12 animate-pulse rounded-[var(--radius)] bg-surface-2" />
        <div className="h-12 animate-pulse rounded-[var(--radius)] bg-surface-2" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Bell className="size-6 text-fg-subtle" />
        <p className="text-sm font-medium text-fg">
          {m.notifications_empty_title()}
        </p>
        <p className="text-xs text-fg-muted">{m.notifications_empty_desc()}</p>
      </div>
    )
  }

  return (
    <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
      {notifications.map((item) => (
        <NotificationItem key={item._id} item={item} onClick={onItemClick} />
      ))}
    </ul>
  )
}

/** Une notification : marque lue au clic, CTA si `actionUrl`. */
function NotificationItem({
  item,
  onClick,
}: {
  item: Doc<'notifications'>
  onClick: (item: Doc<'notifications'>) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(item)}
        className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex items-start gap-2">
          {!item.read && (
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-fg">{item.title}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{item.body}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pl-4">
          <span className="text-[11px] text-fg-subtle">
            {relativeTime(item.createdAt)}
          </span>
          {item.actionUrl && (
            <a
              href={item.actionUrl}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-accent hover:underline"
            >
              {m.notifications_action_renew()}
            </a>
          )}
        </div>
      </button>
    </li>
  )
}
