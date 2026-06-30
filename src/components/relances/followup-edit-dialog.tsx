import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Pencil } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { toast } from '~/components/ui/sonner'
import { dateInputToIso, toDateInputValue } from './format'

export function FollowupEditDialog({
  followupId,
  initialLabel,
  initialDueDate,
  trigger,
}: {
  followupId: Id<'followups'>
  initialLabel: string
  initialDueDate: string
  trigger?: React.ReactNode
}) {
  const update = useMutation(api.followups.update)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(initialLabel)
  const [dueDate, setDueDate] = useState(toDateInputValue(new Date(initialDueDate)))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setLabel(initialLabel)
      setDueDate(toDateInputValue(new Date(initialDueDate)))
      setError(null)
    }
  }, [initialDueDate, initialLabel, open])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      setError(m.dash_newfollowup_error_label_required())
      return
    }
    if (!dueDate) {
      setError(m.dash_newfollowup_error_date_required())
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await update({
        id: followupId,
        label: trimmed,
        dueDate: dateInputToIso(dueDate),
      })
      toast.success('Relance mise à jour.')
      setOpen(false)
    } catch {
      toast.error('La modification a échoué.')
      setError("La relance n'a pas pu être modifiée.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label="Modifier la relance">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la relance</DialogTitle>
          <DialogDescription>
            Mettez à jour l'intitulé ou l'échéance de cette relance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`followup-edit-label-${followupId}`}>
              {m.dash_newfollowup_label_field()}
            </Label>
            <Input
              id={`followup-edit-label-${followupId}`}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={m.dash_newfollowup_label_placeholder()}
              autoFocus
              aria-invalid={Boolean(error) && !label.trim()}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`followup-edit-date-${followupId}`}>
              {m.dash_newfollowup_date_field()}
            </Label>
            <Input
              id={`followup-edit-date-${followupId}`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {m.dash_newfollowup_cancel()}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
