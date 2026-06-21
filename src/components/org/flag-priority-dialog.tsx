import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Star, StarOff } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { errorMessage } from '~/lib/billing/plan'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

/**
 * Action « pointer une priorité » d'un manager sur l'opportunité d'un membre.
 * - non pointée : ouvre un dialog avec note optionnelle → `flagPriority`.
 * - déjà pointée : bouton direct `unflagPriority`.
 * Le serveur garde l'anti-fuite (manager d'une org dont le membre fait partie).
 */
export function FlagPriorityAction({
  opportunityId,
  ownerName,
  flagged,
}: {
  opportunityId: Id<'opportunities'>
  ownerName: string
  flagged: boolean
}) {
  const flag = useMutation(api.opportunities.flagPriority)
  const unflag = useMutation(api.opportunities.unflagPriority)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)

  async function onFlag(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      const args: { id: Id<'opportunities'>; note?: string } = {
        id: opportunityId,
      }
      const n = note.trim()
      if (n) args.note = n
      await flag(args)
      toast.success(m.flag_toast())
      setNote('')
      setOpen(false)
    } catch (err) {
      toast.error(errorMessage(err, m.flag_error()))
    } finally {
      setPending(false)
    }
  }

  async function onUnflag() {
    setPending(true)
    try {
      await unflag({ id: opportunityId })
      toast.success(m.unflag_toast())
    } catch (err) {
      toast.error(errorMessage(err, m.unflag_error()))
    } finally {
      setPending(false)
    }
  }

  if (flagged) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={onUnflag}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <StarOff className="size-4" />
        )}
        <span className="hidden lg:inline">{m.team_unflag_action()}</span>
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Star className="size-4" />
          <span className="hidden lg:inline">{m.team_flag_action()}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.flag_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.flag_dialog_description({ owner: ownerName })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onFlag} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flag-note">{m.flag_note_label()}</Label>
            <Textarea
              id="flag-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={m.flag_note_placeholder()}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Star className="size-4" />
              )}
              {m.flag_submit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
