import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { DueBadge } from '~/components/opportunities/chips'
import { formatDate } from '~/components/opportunities/meta'
import { DetailPanel } from './detail-panel'

/**
 * Panneau de relances rattachées à une proposition. Reprend l'UX du panneau
 * équivalent côté opportunité : ajout inline, coche faite/non faite, suppression,
 * et tous les états (chargement, vide).
 */
export function ProposalFollowupsPanel({
  proposalId,
}: {
  proposalId: Id<'proposals'>
}) {
  const followups = useQuery(api.followups.list, { proposalId })
  const create = useMutation(api.followups.create)
  const toggle = useMutation(api.followups.toggle)

  const [label, setLabel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!label.trim() || !dueDate || pending) return
    setPending(true)
    try {
      await create({ label: label.trim(), dueDate, proposalId })
      toast.success(`Relance planifiée pour le ${formatDate(dueDate)}.`)
      setLabel('')
      setDueDate('')
      setAdding(false)
    } catch {
      toast.error("La relance n'a pas pu être planifiée.")
    } finally {
      setPending(false)
    }
  }

  async function handleToggle(id: Id<'followups'>, done: boolean) {
    try {
      await toggle({ id, done })
      toast.success(done ? 'Relance marquée comme faite.' : 'Relance réactivée.')
    } catch {
      toast.error('Action impossible.')
    }
  }

  return (
    <DetailPanel
      title="Relances"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding((v) => !v)}
          aria-label="Planifier une relance"
        >
          <Plus className="size-4" />
          Planifier
        </Button>
      }
    >
      {adding && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface-2 p-3"
        >
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Relancer par e-mail, appeler..."
            aria-label="Intitulé de la relance"
            autoFocus
          />
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Date de la relance"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !label.trim() || !dueDate}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      )}

      {followups === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : followups.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Aucune relance prévue. Planifiez un suivi pour ne pas laisser cette
          proposition sans réponse.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {followups.map((followup) => (
            <li
              key={followup._id}
              className="flex items-center gap-2.5 rounded-[var(--radius)] border border-border px-3 py-2"
            >
              <button
                type="button"
                onClick={() => handleToggle(followup._id, !followup.done)}
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  followup.done
                    ? 'border-success bg-success text-white'
                    : 'border-border-strong hover:border-accent',
                )}
                aria-label={
                  followup.done ? 'Réactiver la relance' : 'Marquer comme faite'
                }
              >
                {followup.done && <Check className="size-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm',
                    followup.done ? 'text-fg-subtle line-through' : 'text-fg',
                  )}
                >
                  {followup.label}
                </p>
              </div>
              {!followup.done && <DueBadge date={followup.dueDate} />}
            </li>
          ))}
        </ul>
      )}
    </DetailPanel>
  )
}
