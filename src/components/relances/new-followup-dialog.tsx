import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { dateInputToIso, formatDate, toDateInputValue } from './format'

const NO_OPPORTUNITY = '__none__'

/**
 * Création rapide d'une relance, éventuellement liée à une opportunité.
 * États gérés (loading/erreur), toast sur succès. La date par défaut est
 * aujourd'hui ; l'intitulé est requis.
 */
export function NewFollowupDialog({
  trigger,
  defaultOpportunityId,
}: {
  trigger?: React.ReactNode
  defaultOpportunityId?: Id<'opportunities'>
}) {
  const create = useMutation(api.followups.create)
  const opportunities = useQuery(api.opportunities.list, {})

  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [dueDate, setDueDate] = useState(toDateInputValue())
  const [opportunityId, setOpportunityId] = useState<string>(
    defaultOpportunityId ?? NO_OPPORTUNITY,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setLabel('')
    setDueDate(toDateInputValue())
    setOpportunityId(defaultOpportunityId ?? NO_OPPORTUNITY)
    setError(null)
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      setError("L'intitulé est requis.")
      return
    }
    if (!dueDate) {
      setError('Choisissez une date.')
      return
    }

    setSubmitting(true)
    setError(null)
    const iso = dateInputToIso(dueDate)
    const args: {
      label: string
      dueDate: string
      opportunityId?: Id<'opportunities'>
    } = { label: trimmed, dueDate: iso }
    if (opportunityId !== NO_OPPORTUNITY) {
      args.opportunityId = opportunityId as Id<'opportunities'>
    }

    try {
      await create(args)
      toast.success(`Relance planifiée pour le ${formatDate(iso)}.`)
      setOpen(false)
    } catch {
      toast.error("La relance n'a pas pu être planifiée.")
      setError("La relance n'a pas pu être planifiée. Réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Planifier une relance
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planifier une relance</DialogTitle>
          <DialogDescription>
            Notez ce qu'il faut faire et quand. Filon vous le rappellera au bon
            moment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followup-label">Intitulé</Label>
            <Input
              id="followup-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. Relancer après l'entretien"
              autoFocus
              aria-invalid={Boolean(error) && !label.trim()}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followup-date">Date de relance</Label>
            <Input
              id="followup-date"
              type="date"
              value={dueDate}
              min={toDateInputValue()}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followup-opp">Opportunité liée</Label>
            <Select value={opportunityId} onValueChange={setOpportunityId}>
              <SelectTrigger id="followup-opp">
                <SelectValue placeholder="Aucune (relance libre)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OPPORTUNITY}>
                  Aucune (relance libre)
                </SelectItem>
                {(opportunities ?? []).map((opp) => (
                  <SelectItem key={opp._id} value={opp._id}>
                    {opp.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Planifier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
