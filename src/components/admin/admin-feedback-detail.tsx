import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  Bug,
  CalendarClock,
  CheckSquare,
  CircleAlert,
  Globe,
  Lightbulb,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Monitor,
  ScanSearch,
  User,
  X,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { Plan } from '~/lib/billing/plan'
import { forbiddenMessage } from '~/lib/billing/plan'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from '~/components/ui/sonner'
import {
  feedbackStatusLabel,
  FEEDBACK_STATUS_ORDER,
  feedbackTypeLabel,
  feedbackStatusVariant,
  feedbackTypeVariant,
  formatDate,
  initials,
  planBadgeVariant,
  planLabel,
  type FeedbackStatus,
  type FeedbackType,
} from './admin-meta'
import { m } from '~/lib/paraglide/messages'

const TYPE_ICON: Record<FeedbackType, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  other: MessageSquare,
}

/**
 * Panneau détail d'UN feedback (master-detail du back-office). Charge
 * `api.admin.feedbackDetail` et présente le message complet, l'auteur résolu
 * (nom/email/palier), le contexte (page d'origine), la date, plus les actions
 * admin (statut éditable et note interne) via `updateFeedbackStatus`.
 */
export function AdminFeedbackDetail({
  feedbackId,
  onClose,
}: {
  feedbackId: Id<'feedback'>
  onClose: () => void
}) {
  const detail = useQuery(api.admin.feedbackDetail, { id: feedbackId })

  if (detail === undefined) return <DetailSkeleton onClose={onClose} />

  const { feedback, author } = detail
  const TypeIcon = TYPE_ICON[feedback.type]

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted">
            <TypeIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={feedbackTypeVariant(feedback.type)}>
                {feedbackTypeLabel(feedback.type)}
              </Badge>
              <Badge variant={feedbackStatusVariant(feedback.status)}>
                {feedbackStatusLabel(feedback.status)}
              </Badge>
            </div>
            <span className="assay-meta text-xs">
              {formatDate(feedback.createdAt)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={m.admin_close_detail()}
          className="h-11 w-11 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{m.admin_feedback_message_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
              {feedback.message}
            </p>
          </CardContent>
        </Card>

        <AuthorCard author={author} />

        {feedback.context && <ContextCard context={feedback.context} />}
        <MetadataCard feedback={feedback} />

        <ManageCard
          feedbackId={feedbackId}
          status={feedback.status}
          adminNote={feedback.adminNote}
          customerNote={feedback.customerNote}
        />
      </div>
    </div>
  )
}

function MetadataCard({
  feedback,
}: {
  feedback: {
    pageTitle?: string
    browser?: string
    viewport?: string
    userPlan?: string
    organizationId?: string
    entityType?: string
    entityId?: string
    priority?: 'low' | 'medium' | 'high'
    screenshotUrl?: string
    canContactBack?: boolean
  }
}) {
  const rows = [
    feedback.pageTitle
      ? {
          key: 'pageTitle',
          label: 'Page',
          value: feedback.pageTitle,
          icon: Monitor,
        }
      : null,
    feedback.browser
      ? {
          key: 'browser',
          label: 'Navigateur',
          value: feedback.browser,
          icon: Globe,
        }
      : null,
    feedback.viewport
      ? {
          key: 'viewport',
          label: 'Viewport',
          value: feedback.viewport,
          icon: ScanSearch,
        }
      : null,
    feedback.userPlan
      ? {
          key: 'userPlan',
          label: 'Palier',
          value: feedback.userPlan,
          icon: CheckSquare,
        }
      : null,
    feedback.organizationId
      ? {
          key: 'organizationId',
          label: 'Organisation',
          value: feedback.organizationId,
          icon: Link2,
        }
      : null,
    feedback.entityType || feedback.entityId
      ? {
          key: 'entity',
          label: 'Entité',
          value: [feedback.entityType, feedback.entityId].filter(Boolean).join(' · '),
          icon: CircleAlert,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string
    label: string
    value: string
    icon: typeof Globe
  }>

  if (
    rows.length === 0 &&
    !feedback.priority &&
    !feedback.screenshotUrl &&
    feedback.canContactBack === undefined
  ) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Contexte technique</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.key}
                  className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-fg-subtle">
                    <Icon className="size-3.5" />
                    <span>{row.label}</span>
                  </div>
                  <p className="break-all text-sm text-fg">{row.value}</p>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {feedback.priority && (
            <Badge variant="outline">Priorité : {feedback.priority}</Badge>
          )}
          {feedback.canContactBack !== undefined && (
            <Badge variant={feedback.canContactBack ? 'success' : 'outline'}>
              {feedback.canContactBack ? 'Contact autorisé' : 'Contact non souhaité'}
            </Badge>
          )}
          {feedback.screenshotUrl && (
            <a
              href={feedback.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <Link2 className="size-3.5" />
              Capture jointe
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AuthorCard({
  author,
}: {
  author: {
    userId: string
    name?: string
    email?: string
    plan: Plan
  } | null
}) {
  if (!author) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <User className="size-4" />
          </span>
          <span className="text-sm text-fg-muted">
            {m.admin_author_not_found()}
          </span>
        </CardContent>
      </Card>
    )
  }
  const name = author.name?.trim() || author.email || m.admin_user_generic()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{m.admin_author_title()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-fg">{name}</span>
            {author.email && author.name && (
              <span className="truncate text-xs text-fg-subtle">
                {author.email}
              </span>
            )}
          </div>
          <Badge variant={planBadgeVariant(author.plan)} className="shrink-0">
            {planLabel(author.plan)}
          </Badge>
        </div>
        {author.email && (
          <a
            href={`mailto:${author.email}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <Mail className="size-3.5" />
            {author.email}
          </a>
        )}
      </CardContent>
    </Card>
  )
}

function ContextCard({ context }: { context: string }) {
  const isUrl = context.startsWith('/') || context.startsWith('http')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{m.admin_context_title()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
          {isUrl ? (
            <Link2 className="size-4 text-fg-subtle" />
          ) : (
            <CalendarClock className="size-4 text-fg-subtle" />
          )}
          <code className="break-all rounded-[var(--radius-sm)] bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">
            {context}
          </code>
        </span>
      </CardContent>
    </Card>
  )
}

function ManageCard({
  feedbackId,
  status,
  adminNote,
  customerNote,
}: {
  feedbackId: Id<'feedback'>
  status: FeedbackStatus
  adminNote?: string
  customerNote?: string
}) {
  const update = useMutation(api.admin.updateFeedbackStatus)
  const [note, setNote] = useState(adminNote ?? '')
  const [customerMessage, setCustomerMessage] = useState(customerNote ?? '')
  const [saving, setSaving] = useState(false)

  // Resync quand on bascule d'un feedback à l'autre (le composant est remonté
  // via `key`, mais on garde ce filet en cas de mise à jour optimiste).
  useEffect(() => {
    setNote(adminNote ?? '')
    setCustomerMessage(customerNote ?? '')
  }, [adminNote, customerNote])

  const noteDirty = note.trim() !== (adminNote ?? '').trim()
  const customerDirty = customerMessage.trim() !== (customerNote ?? '').trim()

  async function persist(
    nextStatus: FeedbackStatus,
    nextNote: string,
    nextCustomerNote: string,
  ) {
    setSaving(true)
    try {
      const trimmed = nextNote.trim()
      const trimmedCustomer = nextCustomerNote.trim()
      await update(
        {
          id: feedbackId,
          status: nextStatus,
          ...(trimmed ? { adminNote: trimmed } : {}),
          ...(trimmedCustomer ? { customerNote: trimmedCustomer } : {}),
        },
      )
      toast.success(m.admin_toast_feedback_updated())
    } catch (error) {
      toast.error(
        forbiddenMessage(error) ??
          (error instanceof Error ? error.message : m.admin_toast_update_failed()),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{m.admin_manage_title()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-subtle">{m.admin_manage_status()}</span>
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) =>
                persist(value as FeedbackStatus, note, customerMessage)
              }
              disabled={saving}
            >
              <SelectTrigger className="h-11" aria-label={m.admin_manage_status_aria()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {feedbackStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saving && (
              <Loader2 className="size-4 shrink-0 animate-spin text-fg-subtle" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-subtle">Message client</span>
          <Textarea
            value={customerMessage}
            onChange={(e) => setCustomerMessage(e.target.value)}
            placeholder="Expliquez ce que l'équipe a compris, ce qui est prévu ou ce qui vient d'être corrigé."
            rows={4}
            className="resize-none text-sm"
            aria-label="Message client"
          />
          <p className="text-xs text-fg-subtle">
            Ce message sera repris dans la notification envoyée à l'utilisateur quand vous passez le retour en cours ou traité.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-subtle">{m.admin_internal_note()}</span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={m.admin_internal_note_placeholder()}
            rows={3}
            className="resize-none text-sm"
            aria-label={m.admin_internal_note()}
          />
          {(noteDirty || customerDirty) && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => persist(status, note, customerMessage)}
              >
                {m.admin_save_note()}
              </Button>
            </div>
          )}
        </div>

        {customerMessage.trim() && (
          <div className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3">
            <p className="text-xs font-medium text-fg">Aperçu de la réponse client</p>
            <p className="mt-1 text-sm text-fg-muted">
              {customerMessage.trim()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DetailSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-[var(--radius)]" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={m.admin_close_detail()}
          className="h-11 w-11"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="flex flex-col gap-4 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  )
}
