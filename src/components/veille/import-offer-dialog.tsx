import { useState } from 'react'
import { useAction, useMutation } from 'convex/react'
import { Link2, Loader2, ClipboardType } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { detectSource } from '../../../convex/veille/parser'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { toast } from '~/components/ui/sonner'
import { ImportPreviewForm, type PreviewFields } from './import-preview-form'
import { sourceFromHost } from './meta'

type Phase = 'idle' | 'parsing' | 'preview' | 'creating'

const EMPTY: PreviewFields = {
  title: '',
  company: '',
  location: '',
  deadline: '',
  sourceUrl: '',
  notes: '',
}

/** Valeur compatible `<input type="date">` (sinon vide). */
function toDateInput(value?: string): string {
  if (!value) return ''
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

/**
 * Import manuel d'une offre : coller un lien ou du texte, analyser, vérifier
 * l'aperçu, puis créer l'opportunité (étape « Piste »). L'analyse ne fait
 * aucune écriture : la création passe par `api.opportunities.create`.
 */
export function ImportOfferDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const parseSource = useAction(api.veille.actions.parseSource)
  const create = useMutation(api.opportunities.create)

  const [phase, setPhase] = useState<Phase>('idle')
  const [tab, setTab] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [partial, setPartial] = useState(false)
  const [fields, setFields] = useState<PreviewFields>(EMPTY)
  const [source, setSource] = useState<ReturnType<typeof detectSource>>('autre')

  function reset() {
    setPhase('idle')
    setTab('url')
    setUrl('')
    setText('')
    setPartial(false)
    setFields(EMPTY)
    setSource('autre')
  }

  function handleOpenChange(next: boolean) {
    if (phase === 'parsing' || phase === 'creating') return
    if (!next) reset()
    onOpenChange(next)
  }

  async function analyze() {
    const args: { url?: string; text?: string } = {}
    if (tab === 'url') {
      const u = url.trim()
      if (!u) return
      args.url = u
    } else {
      const t = text.trim()
      if (!t) return
      args.text = t
    }
    setPhase('parsing')
    try {
      const parsed = await parseSource(args)
      setSource(parsed.source === 'manuel' ? 'autre' : parsed.source)
      setPartial(Boolean(parsed.partial))
      setFields({
        title: parsed.title ?? '',
        company: parsed.company ?? '',
        location: parsed.location ?? '',
        deadline: toDateInput(parsed.deadline),
        sourceUrl: parsed.sourceUrl ?? (tab === 'url' ? url.trim() : ''),
        notes: parsed.description ?? parsed.raw ?? '',
      })
      setPhase('preview')
    } catch {
      toast.error("L'analyse de l'offre a échoué. Réessayez ou collez le texte.")
      setPhase('idle')
    }
  }

  async function confirm() {
    const title = fields.title.trim()
    if (!title) {
      toast.error('Un intitulé est requis pour créer l’opportunité.')
      return
    }
    const importSource =
      tab === 'text' ? 'manuel' : (source as 'educarriere' | 'linkedin' | 'autre')
    const host = sourceFromHost(fields.sourceUrl)

    // Construction dynamique : aucun champ undefined transmis à Convex.
    const args: Record<string, unknown> = {
      title,
      type: 'job_offer',
      stage: 'lead',
      tags: ['veille', importSource],
      importSource,
      importedAt: Date.now(),
    }
    const sourceLabel = fields.company.trim() || host
    if (sourceLabel) args.source = sourceLabel
    if (fields.sourceUrl.trim()) {
      args.sourceUrl = fields.sourceUrl.trim()
      args.url = fields.sourceUrl.trim()
    }
    if (fields.location.trim()) args.location = fields.location.trim()
    if (fields.deadline.trim()) args.deadline = fields.deadline.trim()
    if (fields.notes.trim()) args.description = fields.notes.trim()

    setPhase('creating')
    try {
      await create(args as Parameters<typeof create>[0])
      toast.success('Offre importée dans votre pipeline.')
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Impossible d'importer l'offre.")
      setPhase('preview')
    }
  }

  const busy = phase === 'parsing' || phase === 'creating'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer une offre</DialogTitle>
          <DialogDescription>
            Collez le lien d'une offre ou son texte. Filon analyse la page et
            crée une piste dans votre pipeline.
          </DialogDescription>
        </DialogHeader>

        {phase === 'preview' || phase === 'creating' ? (
          <>
            <ImportPreviewForm
              fields={fields}
              partial={partial}
              onChange={setFields}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPhase('idle')}
                disabled={busy}
              >
                Retour
              </Button>
              <Button onClick={confirm} disabled={busy}>
                {phase === 'creating' && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Créer l'opportunité
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'url' | 'text')}>
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1">
                  <Link2 className="size-4" />
                  Lien
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1">
                  <ClipboardType className="size-4" />
                  Texte
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-1.5">
                <Label htmlFor="veille-source-url">Lien de l'offre</Label>
                <Input
                  id="veille-source-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://emploi.educarriere.ci/offre-..."
                  autoFocus
                />
              </TabsContent>
              <TabsContent value="text" className="space-y-1.5">
                <Label htmlFor="veille-source-text">Texte de l'offre</Label>
                <Textarea
                  id="veille-source-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Collez ici le contenu d'une offre LinkedIn ou autre..."
                  className="min-h-40"
                />
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={busy}
              >
                Annuler
              </Button>
              <Button
                onClick={analyze}
                disabled={busy || (tab === 'url' ? !url.trim() : !text.trim())}
              >
                {phase === 'parsing' && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Analyser
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
