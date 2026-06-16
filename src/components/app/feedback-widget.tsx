import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { useLocation } from '@tanstack/react-router'
import { MessageSquarePlus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
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

  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  // Reset a chaque ouverture pour repartir d'un etat vierge.
  useEffect(() => {
    if (open) {
      setType('bug')
      setMessage('')
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
      // Construction dynamique : aucun champ undefined transmis a Convex.
      const args: { type: FeedbackType; message: string; context?: string } = {
        type,
        message: trimmed,
      }
      if (context) args.context = context

      await submit(args)
      toast.success(m.feedback_success())
      onOpenChange(false)
    } catch {
      toast.error(m.feedback_error())
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
              <MessageSquarePlus className="size-4" />
            </span>
            {m.feedback_title()}
          </DialogTitle>
          <DialogDescription>{m.feedback_description()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
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
