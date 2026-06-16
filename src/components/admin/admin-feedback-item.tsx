import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, MapPin, User } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from '~/components/ui/sonner'
import { forbiddenMessage } from '~/lib/billing/plan'
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_STATUS_ORDER,
  FEEDBACK_TYPE_LABEL,
  feedbackStatusVariant,
  feedbackTypeVariant,
  formatRelative,
  type FeedbackStatus,
  type FeedbackType,
} from './admin-meta'
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

/**
 * Carte d'un retour utilisateur : auteur, type, message, contexte, date, Select
 * de statut (mise à jour optimiste via `updateFeedbackStatus`) et note admin.
 */
export function AdminFeedbackItem({ item }: { item: FeedbackEntry }) {
  const update = useMutation(api.admin.updateFeedbackStatus)
  const [note, setNote] = useState(item.adminNote ?? '')
  const [saving, setSaving] = useState(false)

  const author =
    item.authorName?.trim() || item.authorEmail || 'Utilisateur inconnu'
  const noteDirty = note.trim() !== (item.adminNote ?? '').trim()

  async function persist(status: FeedbackStatus, nextNote: string) {
    setSaving(true)
    try {
      const trimmed = nextNote.trim()
      await update(
        trimmed
          ? { id: item._id, status, adminNote: trimmed }
          : { id: item._id, status },
      )
      toast.success('Retour mis à jour.')
    } catch (error) {
      toast.error(
        forbiddenMessage(error) ??
          (error instanceof Error
            ? error.message
            : 'La mise à jour a échoué.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={feedbackTypeVariant(item.type)}>
            {FEEDBACK_TYPE_LABEL[item.type]}
          </Badge>
          <Badge variant={feedbackStatusVariant(item.status)}>
            {FEEDBACK_STATUS_LABEL[item.status]}
          </Badge>
        </div>
        <span className="assay-meta whitespace-nowrap text-xs">
          {formatRelative(item.createdAt)}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
        {item.message}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <User className="size-3.5 text-fg-subtle" />
          {author}
        </span>
        {item.context && (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-fg-subtle" />
            <code className="rounded-[var(--radius-sm)] bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">
              {item.context}
            </code>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-fg-muted">Statut</span>
          <Select
            value={item.status}
            onValueChange={(value) =>
              persist(value as FeedbackStatus, note)
            }
            disabled={saving}
          >
            <SelectTrigger className="h-11 w-44" aria-label="Changer le statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {FEEDBACK_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {saving && (
            <Loader2 className="size-4 animate-spin text-fg-subtle" />
          )}
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note interne (optionnelle)"
          rows={2}
          className="resize-none text-sm"
          aria-label="Note interne"
        />
        {noteDirty && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => persist(item.status, note)}
            >
              Enregistrer la note
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
