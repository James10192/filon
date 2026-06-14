import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
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
import { ValueCombobox } from '~/components/ui/value-combobox'
import { toast } from '~/components/ui/sonner'

type Company = Doc<'companies'>

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si fourni, mode edition. Sinon, mode creation. */
  company?: Company | null
}) {
  const createCompany = useMutation(api.companies.create)
  const updateCompany = useMutation(api.companies.update)
  const isEdit = Boolean(company)

  // Suggestions derivees des entreprises existantes (coherence des donnees).
  const allCompanies = useQuery(api.companies.list, open ? {} : 'skip')
  const suggestions = useMemo(() => {
    const list = allCompanies ?? []
    return {
      sector: list.map((c) => c.sector ?? '').filter(Boolean),
      location: list.map((c) => c.location ?? '').filter(Boolean),
      source: list.map((c) => c.source ?? '').filter(Boolean),
    }
  }, [allCompanies])

  const [form, setForm] = useState({
    name: '',
    website: '',
    sector: '',
    location: '',
    source: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Reinitialise le formulaire a l'ouverture / au changement d'entreprise.
  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      name: company?.name ?? '',
      website: company?.website ?? '',
      sector: company?.sector ?? '',
      location: company?.location ?? '',
      source: company?.source ?? '',
      notes: company?.notes ?? '',
    })
  }, [open, company])

  function field<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError("Le nom de l'entreprise est requis.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (isEdit && company) {
        await updateCompany({
          id: company._id,
          name,
          website: form.website.trim(),
          sector: form.sector.trim(),
          location: form.location.trim(),
          source: form.source.trim(),
          notes: form.notes.trim(),
        })
        toast.success('Modifications enregistrees.')
      } else {
        // Construit les args dynamiquement : jamais `undefined` en arg Convex.
        const args: {
          name: string
          website?: string
          sector?: string
          location?: string
          source?: string
          notes?: string
        } = { name }
        if (form.website.trim()) args.website = form.website.trim()
        if (form.sector.trim()) args.sector = form.sector.trim()
        if (form.location.trim()) args.location = form.location.trim()
        if (form.source.trim()) args.source = form.source.trim()
        if (form.notes.trim()) args.notes = form.notes.trim()
        await createCompany(args)
        toast.success('Entreprise ajoutee.')
      }
      onOpenChange(false)
    } catch {
      toast.error(
        isEdit
          ? "Les modifications n'ont pas pu etre enregistrees."
          : "Impossible d'ajouter l'entreprise.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'entreprise" : 'Ajouter une entreprise'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Mettez a jour les informations de cette entreprise.'
              : 'Enregistrez une entreprise que vous ciblez ou avec qui vous echangez.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="company-name">Nom</Label>
            <Input
              id="company-name"
              value={form.name}
              onChange={field('name')}
              placeholder="Nom de l'entreprise"
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="company-sector">Secteur</Label>
              <ValueCombobox
                id="company-sector"
                value={form.sector}
                onChange={(v) => setForm((f) => ({ ...f, sector: v }))}
                suggestions={suggestions.sector}
                placeholder="Ex. Fintech, agence web"
                searchPlaceholder="Secteur..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company-location">Localisation</Label>
              <ValueCombobox
                id="company-location"
                value={form.location}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                suggestions={suggestions.location}
                placeholder="Ex. Abidjan, remote"
                searchPlaceholder="Localisation..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="company-website">Site web</Label>
              <Input
                id="company-website"
                value={form.website}
                onChange={field('website')}
                placeholder="https://..."
                inputMode="url"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company-source">Source</Label>
              <ValueCombobox
                id="company-source"
                value={form.source}
                onChange={(v) => setForm((f) => ({ ...f, source: v }))}
                suggestions={suggestions.source}
                placeholder="LinkedIn, recommandation..."
                searchPlaceholder="Source..."
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="company-notes">Notes</Label>
            <Textarea
              id="company-notes"
              value={form.notes}
              onChange={field('notes')}
              placeholder="Details, contexte, points a suivre"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
