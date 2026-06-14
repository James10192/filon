import { AlertTriangle } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'

/** Champs éditables d'un aperçu d'offre, prêts pour `opportunities.create`. */
export type PreviewFields = {
  title: string
  company: string
  location: string
  deadline: string
  sourceUrl: string
  notes: string
}

/**
 * Formulaire d'aperçu : champs pré-remplis depuis l'analyse, tous éditables.
 * En cas d'analyse partielle, un avertissement invite à compléter, mais la
 * création reste toujours possible.
 */
export function ImportPreviewForm({
  fields,
  partial,
  onChange,
}: {
  fields: PreviewFields
  partial: boolean
  onChange: (next: PreviewFields) => void
}) {
  function set<K extends keyof PreviewFields>(key: K, value: string) {
    onChange({ ...fields, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      {partial && (
        <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-warning/40 bg-warning-soft px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="space-y-0.5">
            <Badge variant="warning">Analyse partielle</Badge>
            <p className="text-sm text-fg-muted">
              Certains champs n'ont pas pu être lus automatiquement. Complétez
              les informations avant de créer l'opportunité.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="veille-title">Intitulé</Label>
        <Input
          id="veille-title"
          value={fields.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Intitulé du poste"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="veille-company">Entreprise</Label>
          <Input
            id="veille-company"
            value={fields.company}
            onChange={(e) => set('company', e.target.value)}
            placeholder="Recruteur ou société"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="veille-location">Lieu</Label>
          <Input
            id="veille-location"
            value={fields.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Ville, région"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="veille-deadline">Date limite</Label>
          <Input
            id="veille-deadline"
            type="date"
            value={fields.deadline}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="veille-url">Lien de l'offre</Label>
          <Input
            id="veille-url"
            value={fields.sourceUrl}
            onChange={(e) => set('sourceUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="veille-notes">Description</Label>
        <Textarea
          id="veille-notes"
          value={fields.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Contenu de l'offre, notes complémentaires..."
          className="min-h-32"
        />
      </div>
    </div>
  )
}
