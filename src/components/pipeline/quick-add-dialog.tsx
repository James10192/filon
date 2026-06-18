import { useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
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
import { handlePlanLimit } from '~/lib/billing/upsell'
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
      toast.success(m.opp_added())
      onOpenChange(false)
    } catch (error) {
      if (!handlePlanLimit(error)) {
        toast.error(m.opp_add_error())
      }
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.opp_add_opportunity()}</DialogTitle>
          <DialogDescription>
            {m.opp_quick_add_desc()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="quick-add-title">{m.opp_form_title_label()}</Label>
            <Input
              id="quick-add-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={m.opp_form_title_placeholder()}
              autoComplete="off"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="quick-add-type">{m.opp_form_type_label()}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as OppType)}
              >
                <SelectTrigger id="quick-add-type">
                  <SelectValue placeholder={m.opp_form_type_placeholder()} />
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
              <Label htmlFor="quick-add-stage">{m.opp_form_stage_label()}</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as Stage)}
              >
                <SelectTrigger id="quick-add-stage">
                  <SelectValue placeholder={m.opp_form_stage_placeholder()} />
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
              {m.opp_cancel()}
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {m.opp_add()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
