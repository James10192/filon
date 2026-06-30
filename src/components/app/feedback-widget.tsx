import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useLocation } from '@tanstack/react-router'
import { MessageSquarePlus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

/**
 * Widget de feedback in-app : bouton flottant discret en bas a droite, ouvre un
 * dialog (type + message) avec capture automatique du chemin de page courant via
 * le router TanStack. Monte dans le layout de l'app authentifiee uniquement.
 *
 * Le bouton flottant se place au-dessus de la barre de navigation basse mobile
 * (`MobileBottombar`, fixe bottom-0) pour ne pas la chevaucher ; en desktop il
 * occupe le coin bas-droite (le lanceur copilote vit dans la topbar, pas en
 * flottant : aucun conflit).
 */

type FeedbackType = 'bug' | 'idea' | 'other'
type FeedbackPriority = 'low' | 'medium' | 'high'

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={m.feedback_open()}
        className={cn(
          'fixed right-4 z-30 inline-flex h-11 items-center gap-2 rounded-full',
          'border border-border bg-surface px-4 text-sm font-medium text-fg-muted',
          'shadow-[var(--shadow-card)] transition-colors',
          'hover:bg-surface-2 hover:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
          // Au-dessus de la bottombar mobile (~3.5rem + safe-area) ; coin bas en desktop.
          'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-5',
        )}
      >
        <MessageSquarePlus className="size-4 text-accent" />
        <span className="hidden sm:inline">{m.feedback_open()}</span>
      </button>

      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const location = useLocation()
  const submit = useMutation(api.feedback.submit)
  const reportError = useMutation(api.observability.reportClientError)
  const myPlan = useQuery(api.billing.myPlan, {})

  const [type, setType] = useState<FeedbackType>('bug')
  const [priority, setPriority] = useState<FeedbackPriority>('medium')
  const [message, setMessage] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [canContactBack, setCanContactBack] = useState(true)
  const [pending, setPending] = useState(false)

  // Reset a chaque ouverture pour repartir d'un etat vierge.
  useEffect(() => {
    if (open) {
      setType('bug')
      setPriority('medium')
      setMessage('')
      setScreenshotUrl('')
      setCanContactBack(true)
      setPending(false)
    }
  }, [open])

  // Capture automatique du chemin de page courant (sans query string).
  const context = location.pathname

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      toast.error(m.feedback_message_required())
      return
    }

    setPending(true)
    try {
      const viewport =
        typeof window === 'undefined'
          ? undefined
          : `${window.innerWidth}x${window.innerHeight}`
      const browser =
        typeof navigator === 'undefined' ? undefined : navigator.userAgent
      const pageTitle =
        typeof document === 'undefined' ? undefined : document.title

      const args: {
        type: FeedbackType
        message: string
        context?: string
        pageTitle?: string
        browser?: string
        viewport?: string
        userPlan?: string
        priority?: FeedbackPriority
        screenshotUrl?: string
        canContactBack?: boolean
      } = {
        type,
        message: trimmed,
        priority,
        canContactBack,
      }
      if (context) args.context = context
      if (pageTitle) args.pageTitle = pageTitle
      if (browser) args.browser = browser
      if (viewport) args.viewport = viewport
      if (myPlan?.plan) args.userPlan = myPlan.plan
      if (screenshotUrl.trim()) args.screenshotUrl = screenshotUrl.trim()

      await submit(args)
      toast.success(m.feedback_success())
      onOpenChange(false)
    } catch (error) {
      void reportError({
        feature: 'feedback',
        action: 'submit_feedback',
        message:
          error instanceof Error ? error.message : 'Échec envoi feedback',
        route: context,
        metadata: JSON.stringify({ type, priority }),
      })
      toast.error(m.feedback_error())
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[85vh] w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
              <MessageSquarePlus className="size-4" />
            </span>
            {m.feedback_title()}
          </DialogTitle>
          <DialogDescription>{m.feedback_description()}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="-mx-1 grid min-h-0 gap-4 overflow-y-auto px-1"
        >
          <div className="grid gap-2">
            <Label htmlFor="feedback-type">{m.feedback_type_label()}</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as FeedbackType)}
            >
              <SelectTrigger id="feedback-type" aria-label={m.feedback_type_label()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">{m.feedback_type_bug()}</SelectItem>
                <SelectItem value="idea">{m.feedback_type_idea()}</SelectItem>
                <SelectItem value="other">{m.feedback_type_other()}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">{m.feedback_message_label()}</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={m.feedback_message_placeholder()}
              rows={5}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="feedback-priority">Priorité</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as FeedbackPriority)}
              >
                <SelectTrigger id="feedback-priority" aria-label="Priorité du feedback">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback-screenshot">Capture ou lien</Label>
              <Input
                id="feedback-screenshot"
                value={screenshotUrl}
                onChange={(event) => setScreenshotUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">Vous pouvez me recontacter</p>
              <p className="text-xs text-fg-subtle">
                Autorise le suivi si le retour nécessite une clarification.
              </p>
            </div>
            <Switch
              checked={canContactBack}
              onCheckedChange={setCanContactBack}
              aria-label="Autoriser le recontact"
            />
          </div>

          <p className="text-xs text-fg-subtle">
            {m.feedback_context_label()} : <span className="text-fg-muted">{context}</span>
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {m.feedback_cancel()}
            </Button>
            <Button type="submit" disabled={pending || !message.trim()}>
              {pending ? m.feedback_submitting() : m.feedback_submit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
