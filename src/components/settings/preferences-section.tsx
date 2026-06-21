import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2, RotateCcw } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import {
  CURRENCIES,
  DEFAULT_STAGE_LABELS,
  STAGE_COLOR_VAR,
  STAGE_LABEL_MESSAGES, // libelles localises pour placeholder/aria
  STAGE_ORDER,
  type StageKey,
  isDefaultStageLabels,
  stageLabelsFromArray,
  stageLabelsToArray,
} from './constants'

type Settings = {
  pipelineStages?: string[]
  currency?: string
} | undefined

/**
 * Section preferences : devise par defaut d'affichage du CA et libelles des
 * etapes du pipeline. Le champ stages est optionnel : laisse vide ou remis a
 * zero, ce sont les libelles par defaut du produit qui s'appliquent.
 * Etats geres : loading (skeleton), succes/erreur (toast).
 */
export function PreferencesSection() {
  const settings = useQuery(api.settings.get, {}) as Settings
  const upsert = useMutation(api.settings.upsert)

  const [currency, setCurrency] = useState('XOF')
  const [labels, setLabels] = useState<Record<StageKey, string>>(
    DEFAULT_STAGE_LABELS,
  )
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings !== undefined && !hydrated) {
      setCurrency(settings.currency ?? 'XOF')
      setLabels(stageLabelsFromArray(settings.pipelineStages))
      setHydrated(true)
    }
  }, [settings, hydrated])

  const initialLabels = useMemo(
    () => stageLabelsFromArray(settings?.pipelineStages),
    [settings],
  )
  const initialCurrency = settings?.currency ?? 'XOF'

  if (settings === undefined) return <PreferencesSkeleton />

  const dirty =
    currency !== initialCurrency ||
    STAGE_ORDER.some((key) => labels[key] !== initialLabels[key])
  const usingDefaults = isDefaultStageLabels(labels)

  function setLabel(key: StageKey, value: string) {
    setLabels((prev) => ({ ...prev, [key]: value }))
  }

  function resetStages() {
    setLabels({ ...DEFAULT_STAGE_LABELS })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    // Si les libelles sont les defauts, on n'enregistre pas de tableau (le front
    // retombera sur les defauts) ; sinon on persiste la version ordonnee.
    const args: { currency?: string; pipelineStages?: string[] } = {
      currency,
    }
    if (!usingDefaults) {
      args.pipelineStages = stageLabelsToArray(labels)
    } else {
      // On force un tableau vide pour effacer une personnalisation precedente.
      args.pipelineStages = []
    }

    try {
      await upsert(args)
      toast.success(m.app_changes_saved())
    } catch {
      toast.error(m.app_changes_save_error())
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader>
          <CardTitle>{m.app_preferences_title()}</CardTitle>
          <CardDescription>
            {m.app_preferences_description()}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pref-currency">{m.app_default_currency()}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="pref-currency" className="sm:max-w-xs">
                <SelectValue placeholder={m.app_choose_currency()}>
                  {CURRENCIES.find((c) => c.value === currency)?.label()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div>
                <Label className="text-sm font-medium text-fg">
                  {m.app_stage_labels()}
                </Label>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {m.app_stage_labels_hint()}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetStages}
                disabled={usingDefaults}
                className="self-start shrink-0"
              >
                <RotateCcw className="size-4" />
                {m.app_reset()}
              </Button>
            </div>

            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border">
              {STAGE_ORDER.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-3 bg-surface px-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: STAGE_COLOR_VAR[key] }}
                  />
                  <Input
                    aria-label={m.app_stage_label_aria({ stage: STAGE_LABEL_MESSAGES[key]() })}
                    value={labels[key]}
                    maxLength={40}
                    onChange={(e) => setLabel(key, e.target.value)}
                    placeholder={STAGE_LABEL_MESSAGES[key]()}
                    className="h-9 border-transparent bg-transparent px-2 shadow-none focus-visible:border-border-strong"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {m.app_save()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function PreferencesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full sm:max-w-xs" />
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-40" />
          <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border p-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
