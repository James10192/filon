import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
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
import { STAGES, STAGE_META, TYPE_META, type OppType, type Stage } from './meta'

export type OpportunityFormValues = {
  title: string
  type: OppType
  stage: Stage
  source?: string
  url?: string
  location?: string
  compensation?: string
  deadline?: string
  nextActionAt?: string
  tags: string[]
  description?: string
}

export type OpportunityFormSubmit = {
  title: string
  type: OppType
  stage: Stage
  source?: string
  url?: string
  location?: string
  compensation?: string
  deadline?: string
  nextActionAt?: string
  tags: string[]
  description?: string
}

const TYPE_OPTIONS = Object.entries(TYPE_META) as [
  OppType,
  (typeof TYPE_META)[OppType],
][]

/** Nettoie une string optionnelle : '' -> undefined (jamais d'undefined explicite côté Convex). */
function clean(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function OpportunityForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
  withStage = true,
  pending = false,
}: {
  initial?: Partial<OpportunityFormValues>
  onSubmit: (values: OpportunityFormSubmit) => void | Promise<void>
  onCancel?: () => void
  submitLabel?: string
  withStage?: boolean
  pending?: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<OppType>(initial?.type ?? 'job_offer')
  const [stage, setStage] = useState<Stage>(initial?.stage ?? 'lead')
  const [source, setSource] = useState(initial?.source ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [compensation, setCompensation] = useState(initial?.compensation ?? '')
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) ?? '')
  const [nextActionAt, setNextActionAt] = useState(
    initial?.nextActionAt?.slice(0, 10) ?? '',
  )
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    if (title.trim().length === 0) {
      setTitleError("L'intitulé est obligatoire.")
      return
    }
    setTitleError(null)

    const values: OpportunityFormSubmit = {
      title: title.trim(),
      type,
      stage,
      source: clean(source),
      url: clean(url),
      location: clean(location),
      compensation: clean(compensation),
      deadline: deadline ? deadline : undefined,
      nextActionAt: nextActionAt ? nextActionAt : undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      description: clean(description),
    }
    void onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="opp-title">Intitulé</Label>
        <Input
          id="opp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Développeur React senior"
          aria-invalid={titleError ? true : undefined}
          autoFocus
        />
        {titleError && <p className="text-xs text-danger">{titleError}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as OppType)}>
            <SelectTrigger id="opp-type">
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {withStage && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opp-stage">Étape</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
              <SelectTrigger id="opp-stage">
                <SelectValue placeholder="Choisir une étape" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {STAGE_META[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-compensation">Montant estimé</Label>
          <Input
            id="opp-compensation"
            value={compensation}
            onChange={(e) => setCompensation(e.target.value)}
            placeholder="Ex. 45 000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-location">Lieu</Label>
          <Input
            id="opp-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Remote, Abidjan, hybride..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-source">Source</Label>
          <Input
            id="opp-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="LinkedIn, site, recommandation..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-url">Lien</Label>
          <Input
            id="opp-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-next">Prochaine relance</Label>
          <Input
            id="opp-next"
            type="date"
            value={nextActionAt}
            onChange={(e) => setNextActionAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="opp-deadline">Échéance</Label>
          <Input
            id="opp-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="opp-tags">Étiquettes</Label>
        <Input
          id="opp-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Séparées par des virgules"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="opp-description">Notes</Label>
        <Textarea
          id="opp-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails, contexte, points à suivre"
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
