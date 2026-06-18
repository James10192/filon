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
import { m } from '~/lib/paraglide/messages'

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
      setError(m.carnet_company_name_required())
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
        toast.success(m.carnet_changes_saved())
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
        toast.success(m.carnet_company_added())
      }
      onOpenChange(false)
    } catch {
      toast.error(
        isEdit
          ? m.carnet_changes_save_failed()
          : m.carnet_company_add_failed(),
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
            {isEdit
              ? m.carnet_company_dialog_title_edit()
              : m.carnet_company_dialog_title_create()}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? m.carnet_company_dialog_desc_edit()
              : m.carnet_company_dialog_desc_create()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="company-name">{m.carnet_field_name()}</Label>
            <Input
              id="company-name"
              value={form.name}
              onChange={field('name')}
              placeholder={m.carnet_company_name_placeholder()}
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="company-sector">{m.carnet_field_sector()}</Label>
              <ValueCombobox
                id="company-sector"
                value={form.sector}
                onChange={(v) => setForm((f) => ({ ...f, sector: v }))}
                suggestions={suggestions.sector}
                placeholder={m.carnet_sector_placeholder()}
                searchPlaceholder={m.carnet_sector_search()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company-location">
                {m.carnet_field_location()}
              </Label>
              <ValueCombobox
                id="company-location"
                value={form.location}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                suggestions={suggestions.location}
                placeholder={m.carnet_location_placeholder()}
                searchPlaceholder={m.carnet_location_search()}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="company-website">{m.carnet_field_website()}</Label>
              <Input
                id="company-website"
                value={form.website}
                onChange={field('website')}
                placeholder="https://..."
                inputMode="url"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="company-source">{m.carnet_field_source()}</Label>
              <ValueCombobox
                id="company-source"
                value={form.source}
                onChange={(v) => setForm((f) => ({ ...f, source: v }))}
                suggestions={suggestions.source}
                placeholder={m.carnet_source_placeholder()}
                searchPlaceholder={m.carnet_source_search()}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="company-notes">{m.carnet_field_notes()}</Label>
            <Textarea
              id="company-notes"
              value={form.notes}
              onChange={field('notes')}
              placeholder={m.carnet_notes_placeholder()}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {m.carnet_cancel()}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {m.carnet_save()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
