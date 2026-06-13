import { useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from '~/components/ui/sonner'
import { STAGE_META, STAGE_ORDER, TYPE_META } from './pipeline-meta'
import type { OppType, Stage } from './pipeline-meta'

const TYPE_KEYS = Object.keys(TYPE_META) as OppType[]

/**
 * Création rapide d'une opportunité depuis le board. Le stage cible est
 * pré-rempli (en-tête de colonne) mais reste ajustable. Consomme
 * `api.opportunities.create` (cf. contrat).
 */
export function QuickAddDialog({
  open,
  onOpenChange,
  defaultStage = 'lead',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStage?: Stage
}) {
  const create = useMutation(api.opportunities.create)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<OppType>('job_offer')
  const [stage, setStage] = useState<Stage>(defaultStage)
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Réinitialise et focalise à l'ouverture.
  useEffect(() => {
    if (open) {
      setTitle('')
      setType('job_offer')
      setStage(defaultStage)
      setSubmitting(false)
      const id = window.setTimeout(() => titleRef.current?.focus(), 60)
      return () => window.clearTimeout(id)
    }
  }, [open, defaultStage])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      // Args construits dynamiquement : jamais d'undefined transmis à Convex.
      await create({ title: trimmed, type, stage })
      toast.success('Opportunité ajoutée.')
      onOpenChange(false)
    } catch {
      toast.error("Impossible d'ajouter l'opportunité.")
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une opportunité</DialogTitle>
          <DialogDescription>
            Donnez un intitulé et un type. Vous pourrez compléter les détails
            ensuite.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="quick-add-title">Intitulé</Label>
            <Input
              id="quick-add-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Développeur React senior"
              autoComplete="off"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="quick-add-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as OppType)}
              >
                <SelectTrigger id="quick-add-type">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {TYPE_META[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="quick-add-stage">Étape</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as Stage)}
              >
                <SelectTrigger id="quick-add-stage">
                  <SelectValue placeholder="Choisir une étape" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_ORDER.map((key) => (
                    <SelectItem key={key} value={key}>
                      {STAGE_META[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
