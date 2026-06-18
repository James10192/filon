import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2, UploadCloud } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/sonner'
import { m } from '~/lib/paraglide/messages'
import { guessKind, type DocKind } from './document-kind'

/** Taille maximale acceptee par fichier (20 Mo). */
const MAX_SIZE = 20 * 1024 * 1024

type PendingFile = {
  file: File
  /** Type devine, modifiable avant validation. */
  kind: DocKind
}

/**
 * Zone d'upload : glisser-deposer ou bouton. Gere le flux Convex storage en
 * trois temps (generateUploadUrl, POST du blob, create). Le type est devine
 * depuis le nom du fichier. Un toast confirme chaque ajout.
 */
export function DocumentUpload({
  /** Variante compacte (bandeau) quand la bibliotheque contient deja des docs. */
  compact = false,
}: {
  compact?: boolean
}) {
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
  const createDocument = useMutation(api.documents.create)

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function uploadOne(pending: PendingFile) {
    // 1. URL d'upload signee.
    const uploadUrl = await generateUploadUrl()
    // 2. POST du blob vers le storage Convex.
    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': pending.file.type || 'application/octet-stream' },
      body: pending.file,
    })
    if (!result.ok) {
      throw new Error('upload failed')
    }
    const { storageId } = (await result.json()) as {
      storageId: Id<'_storage'>
    }
    // 3. Enregistrement du document (args sans `undefined`).
    await createDocument({
      name: pending.file.name,
      kind: pending.kind,
      storageId,
      size: pending.file.size,
    })
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    if (uploading) return

    const files = Array.from(fileList)
    const tooBig = files.filter((f) => f.size > MAX_SIZE)
    const valid = files.filter((f) => f.size <= MAX_SIZE)

    if (tooBig.length > 0) {
      toast.error(
        tooBig.length === 1
          ? m.carnet_file_too_big({ name: tooBig[0]!.name })
          : m.carnet_files_too_big({ n: tooBig.length }),
      )
    }
    if (valid.length === 0) return

    setUploading(true)
    let ok = 0
    try {
      for (const file of valid) {
        try {
          await uploadOne({ file, kind: guessKind(file.name) })
          ok += 1
        } catch {
          toast.error(m.carnet_upload_failed_for({ name: file.name }))
        }
      }
      if (ok > 0) {
        toast.success(
          ok === 1
            ? m.carnet_document_added()
            : m.carnet_documents_added({ n: ok }),
        )
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    void handleFiles(event.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragging(false)
      }}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed text-center transition-colors',
        compact ? 'px-5 py-6' : 'px-6 py-12',
        dragging
          ? 'border-accent bg-accent-soft'
          : 'border-border bg-surface-2/40 hover:border-border-strong',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
        aria-label={m.carnet_choose_files_aria()}
      />

      <span
        className={cn(
          'flex items-center justify-center rounded-full text-accent',
          compact ? 'size-10' : 'size-12',
          dragging ? 'bg-surface' : 'bg-accent-soft',
        )}
      >
        {uploading ? (
          <Loader2 className={compact ? 'size-5 animate-spin' : 'size-6 animate-spin'} />
        ) : (
          <UploadCloud className={compact ? 'size-5' : 'size-6'} />
        )}
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-fg">
          {uploading ? m.carnet_upload_in_progress() : m.carnet_drop_files_here()}
        </p>
        {!uploading && (
          <p className="text-xs text-fg-subtle">
            {m.carnet_upload_hint()}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant={compact ? 'outline' : 'default'}
        size={compact ? 'sm' : 'default'}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading && <Loader2 className="size-4 animate-spin" />}
        {m.carnet_choose_file()}
      </Button>
    </div>
  )
}
