import { Bug, Lightbulb, MessageSquare } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import {
  feedbackStatusLabel,
  feedbackTypeLabel,
  feedbackStatusVariant,
  feedbackTypeVariant,
  formatRelative,
  type FeedbackStatus,
  type FeedbackType,
} from './admin-meta'
import { m } from '~/lib/paraglide/messages'
import type { Id } from '../../../convex/_generated/dataModel'

export type FeedbackEntry = {
  _id: Id<'feedback'>
  type: FeedbackType
  message: string
  context?: string
  status: FeedbackStatus
  adminNote?: string
  createdAt: number
  authorEmail?: string
  authorName?: string
}

const TYPE_ICON: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  other: MessageSquare,
}

/**
 * Ligne compacte d'un retour dans la liste master-detail : type, statut, auteur,
 * extrait du message, date. Sélectionnable (ouvre le panneau détail à droite).
 */
export function AdminFeedbackItem({
  item,
  selected,
  onSelect,
  compact,
}: {
  item: FeedbackEntry
  selected: boolean
  onSelect: (id: Id<'feedback'> | null) => void
  compact: boolean
}) {
  const author =
    item.authorName?.trim() || item.authorEmail || m.admin_unknown_user()
  const TypeIcon = TYPE_ICON[item.type]
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(selected ? null : item._id)}
        data-state={selected ? 'selected' : undefined}
        className="flex min-h-11 w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-2 data-[state=selected]:bg-accent-soft"
      >
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-muted">
            <TypeIcon className="size-3.5" />
          </span>
          <Badge
            variant={feedbackStatusVariant(item.status)}
            className="shrink-0"
          >
            {feedbackStatusLabel(item.status)}
          </Badge>
          {!compact && (
            <Badge variant={feedbackTypeVariant(item.type)} className="shrink-0">
              {feedbackTypeLabel(item.type)}
            </Badge>
          )}
          <span className="assay-meta ml-auto shrink-0 text-xs">
            {formatRelative(item.createdAt)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-snug text-fg">
          {item.message}
        </p>
        <span className="truncate text-xs text-fg-subtle">{author}</span>
      </button>
    </li>
  )
}
