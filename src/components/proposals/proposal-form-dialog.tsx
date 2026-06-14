import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
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
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { EntityCombobox } from '~/components/ui/entity-combobox'
import { toast } from '~/components/ui/sonner'

type ProposalDoc = Doc<'proposals'>

const NO_COMPANY = '__none__'
const CURRENCIES = ['XOF', 'EUR', 'USD'] as const

export function ProposalFormDialog({
  open,
  onOpenChange,
  proposal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si fourni, le dialog edite cette proposition. Sinon, creation. */
  proposal?: ProposalDoc | null
}) {
  const isEdit = Boolean(proposal)
  const companies = useQuery(api.companies.list, open ? {} : 'skip')
  const create = useMutation(api.proposals.create)
  const update = useMutation(api.proposals.update)
  const createCompany = useMutation(api.companies.create)

  /** Cree une entreprise inline depuis le combobox et renvoie son id. */
  async function handleCreateCompany(name: string) {
    try {
      const id = await createCompany({ name })
      toast.success('Entreprise creee.')
      return id as string
    } catch {
      toast.error("L'entreprise n'a pas pu etre creee.")
      return null
    }
  }

  const [title, setTitle] = useState('')
  const [pitch, setPitch] = useState('')
  const [companyId, setCompanyId] = useState<string>(NO_COMPANY)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string>('XOF')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; pitch?: string }>({})

  // Réinitialise le formulaire à chaque ouverture (et selon la cible d'édition).
  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitting(false)
    if (proposal) {
      setTitle(proposal.title)
      setPitch(proposal.pitch)
      setCompanyId(proposal.companyId ?? NO_COMPANY)
      setAmount(proposal.amount !== undefined ? String(proposal.amount) : '')
      setCurrency(proposal.currency ?? 'XOF')
    } else {
      setTitle('')
      setPitch('')
      setCompanyId(NO_COMPANY)
      setAmount('')
      setCurrency('XOF')
    }
  }, [open, proposal])

  function validate() {
    const next: { title?: string; pitch?: string } = {}
    if (!title.trim()) next.title = 'Un titre est requis.'
    if (!pitch.trim()) next.pitch = 'Le pitch ne peut pas être vide.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    if (!validate()) return

    // Args construits dynamiquement : jamais `undefined` envoyé à Convex.
    const parsedAmount = amount.trim() ? Number(amount.replace(/\s/g, '')) : undefined
    if (parsedAmount !== undefined && Number.isNaN(parsedAmount)) {
      setErrors((e) => ({ ...e }))
      toast.error('Le montant doit être un nombre.')
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && proposal) {
        const args: {
          id: Id<'proposals'>
          title: string
          pitch: string
          currency: string
          companyId?: Id<'companies'>
          amount?: number
        } = {
          id: proposal._id,
          title: title.trim(),
          pitch: pitch.trim(),
          currency,
        }
        if (companyId !== NO_COMPANY) args.companyId = companyId as Id<'companies'>
        if (parsedAmount !== undefined) args.amount = parsedAmount
        await update(args)
        toast.success('Proposition mise à jour.')
      } else {
        const args: {
          title: string
          pitch: string
          currency: string
          companyId?: Id<'companies'>
          amount?: number
        } = {
          title: title.trim(),
          pitch: pitch.trim(),
          currency,
        }
        if (companyId !== NO_COMPANY) args.companyId = companyId as Id<'companies'>
        if (parsedAmount !== undefined) args.amount = parsedAmount
        await create(args)
        toast.success('Proposition enregistrée.')
      }
      onOpenChange(false)
    } catch {
      toast.error(
        isEdit
          ? "La proposition n'a pas pu être mise à jour."
          : "Impossible d'enregistrer la proposition.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier la proposition' : 'Nouvelle proposition'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Mettez à jour le pitch, la cible ou le montant.'
              : 'Décrivez ce que vous proposez et à quelle entreprise.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proposal-title">Titre</Label>
            <Input
              id="proposal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Refonte du site vitrine"
              aria-invalid={Boolean(errors.title)}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-danger">{errors.title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proposal-pitch">Pitch</Label>
            <Textarea
              id="proposal-pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Ce que vous proposez, la valeur apportée, le contexte..."
              className="min-h-28"
              aria-invalid={Boolean(errors.pitch)}
            />
            {errors.pitch && (
              <p className="text-xs text-danger">{errors.pitch}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proposal-company">Entreprise cible</Label>
            <EntityCombobox
              id="proposal-company"
              items={(companies ?? []).map((c) => ({
                value: c._id,
                label: c.name,
              }))}
              value={companyId}
              onChange={setCompanyId}
              onCreate={handleCreateCompany}
              emptyValue={NO_COMPANY}
              emptyLabel="Aucune entreprise"
              placeholder="Aucune entreprise"
              searchPlaceholder="Rechercher ou creer une entreprise..."
              noResultLabel="Aucune entreprise trouvee."
              createLabel="Creer l'entreprise"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proposal-amount">Montant estimé</Label>
              <Input
                id="proposal-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex. 800 000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proposal-currency">Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="proposal-currency" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
