import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
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
import { cn } from '~/lib/utils'
import {
  STAGES,
  STAGE_META,
  stageLabel,
  type StageLabelSet,
} from '~/components/opportunities/meta'

/** Options du jeu d'etiquettes (persona lens), dans l'ordre du selecteur. */
const LENS_OPTIONS: { value: StageLabelSet; label: () => string }[] = [
  { value: 'emploi', label: m.app_lens_emploi },
  { value: 'vente', label: m.app_lens_vente },
  { value: 'recrutement', label: m.app_lens_recrutement },
]

type Me = { stageLabelSet?: StageLabelSet | null } | null | undefined

/**
 * Section « Mon espace » : choix du jeu d'etiquettes de pipeline (persona lens)
 * avec apercu en direct des 7 etapes. N'altere PAS les cles internes du
 * pipeline : seul l'affichage des libelles change. Etats geres : loading
 * (skeleton), succes / erreur (toast).
 */
export function MonEspaceSection() {
  const me = useQuery(api.users.me) as Me
  const save = useMutation(api.users.setStageLabelSet)

  const [set, setSet] = useState<StageLabelSet>('emploi')
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (me !== undefined && !hydrated) {
      const raw = me?.stageLabelSet
      setSet(raw === 'vente' || raw === 'recrutement' ? raw : 'emploi')
      setHydrated(true)
    }
  }, [me, hydrated])

  if (me === undefined) return <MonEspaceSkeleton />

  const current =
    me?.stageLabelSet === 'vente' || me?.stageLabelSet === 'recrutement'
      ? me.stageLabelSet
      : 'emploi'
  const dirty = set !== current

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await save({ set })
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
          <CardTitle>{m.app_mon_espace_title()}</CardTitle>
          <CardDescription>{m.app_mon_espace_description()}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lens-set">{m.app_lens_label()}</Label>
            <Select
              value={set}
              onValueChange={(v) => setSet(v as StageLabelSet)}
            >
              <SelectTrigger id="lens-set" className="sm:max-w-xs">
                {/*
                  Libelle resolu explicitement : Radix ne reporte le texte de
                  l'item dans le trigger qu'apres ouverture du menu. Pour une
                  valeur posee par l'etat (jamais cliquee), le trigger resterait
                  vide. On rend donc le libelle courant nous-memes.
                */}
                <SelectValue placeholder={m.app_lens_label()}>
                  {LENS_OPTIONS.find((o) => o.value === set)?.label()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LENS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2.5">
            <Label className="text-sm font-medium text-fg">
              {m.app_lens_preview()}
            </Label>
            <p className="-mt-1 text-xs text-fg-subtle">
              {m.app_lens_preview_hint()}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stage) => (
                <span
                  key={stage}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
                    STAGE_META[stage].chip,
                  )}
                >
                  <span
                    aria-hidden
                    className={cn('size-1.5 rounded-full', STAGE_META[stage].dot)}
                  />
                  {stageLabel(stage, set)}
                </span>
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

function MonEspaceSkeleton() {
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
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
