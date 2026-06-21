import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, Upload } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

/** Une ligne collée -> contact. Format : « Nom, téléphone, note » (2 derniers optionnels). */
type Entry = { name: string; phone?: string; notes?: string }

function parseEntries(text: string): Entry[] {
  const out: Entry[] = []
  for (const raw of text.split('\n')) {
    const parts = raw.split(',').map((p) => p.trim())
    const name = parts[0]?.trim()
    if (!name) continue
    const entry: Entry = { name }
    if (parts[1]) entry.phone = parts[1]
    if (parts.slice(2).join(', ')) entry.notes = parts.slice(2).join(', ')
    out.push(entry)
  }
  return out
}

/**
 * Import rapide du carnet (activation « non-vide-vite »). Coller une liste, un
 * contact par ligne, et Filon remplit le carnet. États gérés (compte détecté,
 * envoi, succès/erreur via toast).
 */
export function ImportContactsDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (count: number) => void
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const bulkCreate = useMutation(api.contactsImport.bulkCreate)

  const entries = useMemo(() => parseEntries(text), [text])

  async function onSubmit() {
    if (entries.length === 0) return
    setSaving(true)
    try {
      const { created } = await bulkCreate({ entries })
      toast.success(m.import_carnet_success({ n: created }))
      setText('')
      onOpenChange(false)
      onSuccess?.(created)
    } catch {
      toast.error(m.import_carnet_error())
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.import_carnet_title()}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {m.import_carnet_desc()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={m.import_carnet_placeholder()}
            rows={8}
            className="resize-y font-mono text-sm"
          />
          <p className="text-xs text-fg-subtle">{m.import_carnet_hint()}</p>
        </div>

        <DialogFooter className="sm:items-center sm:justify-between">
          <span className="text-sm text-fg-muted">
            {m.import_carnet_detected({ n: entries.length })}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {m.app_cancel()}
            </Button>
            <Button onClick={onSubmit} disabled={saving || entries.length === 0}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {m.import_carnet_submit()}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
