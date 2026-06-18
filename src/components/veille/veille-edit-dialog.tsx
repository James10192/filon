import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { CONNECTOR_META } from '../../../convex/veille/connectors'
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
import { Switch } from '~/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'
import { handlePlanLimit } from '~/lib/billing/upsell'
import { m } from '~/lib/paraglide/messages'
import {
  intentLabel,
  locationLabel,
  toVeilleLocation,
  type VeilleIntent,
  type VeilleLocation,
} from './meta'

const INTENTS: VeilleIntent[] = ['apply', 'prospect', 'both']
const LOCATIONS: VeilleLocation[] = ['all', 'abidjan', 'remote']

/** Découpe une saisie libre en mots-clés propres (virgule / saut de ligne). */
function splitTokens(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
}

/** Ajoute des tokens à une liste sans doublon (insensible à la casse). */
function addTokens(existing: string[], tokens: string[]): string[] {
  const out = [...existing]
  const seen = new Set(existing.map((k) => k.toLowerCase()))
  for (const t of tokens) {
    const key = t.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(t)
    }
  }
  return out
}

/**
 * Formulaire riche de création / édition d'une veille. `search` présent = édition.
 * Mots-clés saisis en chips (Entrée ou virgule), sources en chips à bascule,
 * intention en segmented control. Gère la limite freemium (handlePlanLimit).
 */
export function VeilleEditDialog({
  open,
  onOpenChange,
  search,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  search?: Doc<'savedSearches'>
}) {
  const create = useMutation(api.savedSearches.create)
  const update = useMutation(api.savedSearches.update)
  const isEdit = Boolean(search)

  const [name, setName] = useState('')
  const [intent, setIntent] = useState<VeilleIntent>('apply')
  const [include, setInclude] = useState<string[]>([])
  const [exclude, setExclude] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [location, setLocation] = useState<VeilleLocation>('all')
  const [notify, setNotify] = useState(false)
  const [includeDraft, setIncludeDraft] = useState('')
  const [excludeDraft, setExcludeDraft] = useState('')
  const [saving, setSaving] = useState(false)

  // (Ré)hydrate le formulaire à l'ouverture, selon création ou édition.
  useEffect(() => {
    if (!open) return
    setName(search?.name ?? '')
    setIntent(search?.intent ?? 'apply')
    setInclude(search?.keywords ?? [])
    setExclude(search?.excludeKeywords ?? [])
    setSources(search?.sources ?? [])
    setLocation(toVeilleLocation(search?.location))
    setNotify(search?.notify ?? false)
    setIncludeDraft('')
    setExcludeDraft('')
  }, [open, search])

  function commitInclude() {
    const tokens = splitTokens(includeDraft)
    if (tokens.length > 0) setInclude((prev) => addTokens(prev, tokens))
    setIncludeDraft('')
  }

  function commitExclude() {
    const tokens = splitTokens(excludeDraft)
    if (tokens.length > 0) setExclude((prev) => addTokens(prev, tokens))
    setExcludeDraft('')
  }

  function toggleSource(id: string) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  async function handleSave() {
    // Fusionne la saisie en cours non validée pour ne rien perdre.
    const finalInclude = addTokens(include, splitTokens(includeDraft))
    const finalExclude = addTokens(exclude, splitTokens(excludeDraft))
    if (finalInclude.length === 0) {
      toast.error(m.veille_form_keyword_required())
      return
    }

    // Args dynamiques : on n'envoie jamais d'undefined à Convex.
    const args: Record<string, unknown> = {
      keywords: finalInclude,
      intent,
      location,
      notify,
      excludeKeywords: finalExclude,
      sources,
    }
    const trimmedName = name.trim()
    if (trimmedName) args.name = trimmedName

    setSaving(true)
    try {
      if (search) {
        await update({ id: search._id, ...args })
        toast.success(m.veille_toast_updated())
      } else {
        await create(args as Parameters<typeof create>[0])
        toast.success(m.veille_toast_created())
      }
      onOpenChange(false)
    } catch (error) {
      if (!handlePlanLimit(error)) {
        toast.error(
          isEdit ? m.veille_toast_update_failed() : m.veille_toast_create_failed(),
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.veille_form_edit_title() : m.veille_form_create_title()}
          </DialogTitle>
          <DialogDescription>
            {m.veille_form_desc()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="veille-name">{m.veille_form_name_label()}</Label>
            <Input
              id="veille-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.veille_form_name_placeholder()}
            />
          </div>

          {/* Intention */}
          <div className="space-y-1.5">
            <Label>{m.veille_form_intent_label()}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {INTENTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIntent(value)}
                  aria-pressed={intent === value}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-[var(--radius-sm)] border px-2 text-center text-sm font-medium transition-colors',
                    intent === value
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
                  )}
                >
                  {value === 'both' ? m.veille_intent_both_short() : intentLabel(value)}
                </button>
              ))}
            </div>
          </div>

          {/* Mots-clés inclus */}
          <ChipField
            label={m.veille_form_include_label()}
            hint={m.veille_form_include_hint()}
            placeholder={m.veille_form_include_placeholder()}
            chips={include}
            draft={includeDraft}
            onDraftChange={setIncludeDraft}
            onCommit={commitInclude}
            onRemove={(kw) => setInclude((prev) => prev.filter((k) => k !== kw))}
            chipVariant="accent"
          />

          {/* Mots-clés exclus */}
          <ChipField
            label={m.veille_form_exclude_label()}
            hint={m.veille_form_exclude_hint()}
            placeholder={m.veille_form_exclude_placeholder()}
            chips={exclude}
            draft={excludeDraft}
            onDraftChange={setExcludeDraft}
            onCommit={commitExclude}
            onRemove={(kw) => setExclude((prev) => prev.filter((k) => k !== kw))}
            chipVariant="outline"
            chipPrefix={m.veille_form_exclude_chip_prefix()}
          />

          {/* Sources */}
          <div className="space-y-1.5">
            <Label>{m.veille_form_sources_label()}</Label>
            <p className="text-xs text-fg-subtle">
              {m.veille_form_sources_hint()}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONNECTOR_META.map((c) => {
                const active = sources.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSource(c.id)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex h-8 items-center rounded-[var(--radius-sm)] border px-3 text-sm font-medium transition-colors',
                      active
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
                    )}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Localisation */}
          <div className="space-y-1.5">
            <Label htmlFor="veille-location">{m.veille_form_location_label()}</Label>
            <Select
              value={location}
              onValueChange={(v) => setLocation(v as VeilleLocation)}
            >
              <SelectTrigger id="veille-location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {locationLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification */}
          <label
            htmlFor="veille-notify"
            className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm font-medium text-fg">
              {m.veille_form_notify_label()}
            </span>
            <Switch id="veille-notify" checked={notify} onCheckedChange={setNotify} />
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {m.veille_form_cancel()}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {m.veille_form_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Champ de saisie de mots-clés sous forme de chips. */
function ChipField({
  label,
  hint,
  placeholder,
  chips,
  draft,
  onDraftChange,
  onCommit,
  onRemove,
  chipVariant,
  chipPrefix = '',
}: {
  label: string
  hint: string
  placeholder: string
  chips: string[]
  draft: string
  onDraftChange: (value: string) => void
  onCommit: () => void
  onRemove: (chip: string) => void
  chipVariant: 'accent' | 'outline'
  chipPrefix?: string
}) {
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      onCommit()
    } else if (e.key === 'Backspace' && draft.length === 0 && chips.length > 0) {
      onRemove(chips[chips.length - 1])
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-xs text-fg-subtle">{hint}</span>
      </div>
      <Input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onCommit}
        placeholder={placeholder}
      />
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chips.map((chip) => (
            <Badge key={chip} variant={chipVariant} className="pr-1">
              {chipPrefix}
              {chip}
              <button
                type="button"
                onClick={() => onRemove(chip)}
                aria-label={m.veille_form_remove_chip({ chip })}
                className="-mr-0.5 ml-0.5 flex size-4 items-center justify-center rounded-full transition-colors hover:bg-fg/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
