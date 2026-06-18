import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'
import { DOC_KINDS, KIND_LABELS, type DocKind } from './document-kind'

/**
 * Dialog d'edition des metadonnees d'un document : nom et type. Ne touche pas
 * au fichier lui-meme. Toast sur succes/erreur.
 */
export function DocumentRenameDialog({
  open,
  onOpenChange,
  document,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Doc<'documents'> | null
}) {
  const update = useMutation(api.documents.update)

  const [name, setName] = useState('')
  const [kind, setKind] = useState<DocKind>('autre')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !document) return
    setName(document.name)
    setKind(document.kind as DocKind)
    setError(null)
    setSubmitting(false)
  }, [open, document])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !document) return
    if (!name.trim()) {
      setError(m.carnet_name_required())
      return
    }

    setSubmitting(true)
    try {
      await update({ id: document._id, name: name.trim(), kind })
      toast.success(m.carnet_changes_saved())
      onOpenChange(false)
    } catch {
      toast.error(m.carnet_changes_save_failed())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.carnet_document_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.carnet_document_dialog_desc()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document-name">{m.carnet_field_name()}</Label>
            <Input
              id="document-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder={m.carnet_document_name_placeholder()}
              aria-invalid={Boolean(error)}
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document-kind">{m.carnet_field_type()}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as DocKind)}>
              <SelectTrigger id="document-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {m.carnet_cancel()}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {m.carnet_save()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
