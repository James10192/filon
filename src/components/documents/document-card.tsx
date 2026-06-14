import { useState } from 'react'
import { useMutation } from 'convex/react'
import {
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { toast } from '~/components/ui/sonner'
import {
  KIND_ICONS,
  KIND_LABELS,
  formatCreatedAt,
  formatSize,
  type DocKind,
} from './document-kind'

type DocumentRow = Doc<'documents'> & { url: string | null }

/**
 * Tuile d'un document : type, nom, meta (taille, date), apercu/telechargement
 * et menu d'actions (modifier, supprimer via AlertDialog). Tous les etats sont
 * confirmes par un toast.
 */
export function DocumentCard({
  document,
  onEdit,
}: {
  document: DocumentRow
  onEdit: (document: Doc<'documents'>) => void
}) {
  const remove = useMutation(api.documents.remove)

  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const kind = document.kind as DocKind
  const Icon = KIND_ICONS[kind]
  const size = formatSize(document.size)
  const createdAt = formatCreatedAt(document.createdAt)
  const available = Boolean(document.url)

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await remove({ id: document._id })
      toast.success('Document supprime.')
    } catch {
      toast.error('La suppression a echoue.')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  function openInNewTab() {
    if (document.url) window.open(document.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-border-strong sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-surface-2 text-fg-muted">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-semibold tracking-[-0.01em] text-fg"
            title={document.name}
          >
            {document.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-subtle">
            <Badge variant="outline" className="h-5 px-1.5">
              {KIND_LABELS[kind]}
            </Badge>
            {size && <span className="tabular-nums">{size}</span>}
            {createdAt && <span>Ajoute le {createdAt}</span>}
          </div>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Actions"
              disabled={busy}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => onEdit(document)}>
              <Pencil className="size-4" />
              Modifier
            </DropdownMenuItem>
            {available && (
              <DropdownMenuItem asChild>
                <a
                  href={document.url ?? undefined}
                  download={document.name}
                >
                  <Download className="size-4" />
                  Telecharger
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-auto flex items-center gap-2">
        {available ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={openInNewTab}
            >
              <Eye className="size-4" />
              Apercu
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={document.url ?? undefined} download={document.name}>
                <Download className="size-4" />
                <span className="sr-only">Telecharger</span>
              </a>
            </Button>
          </>
        ) : (
          <p className="text-xs text-fg-subtle">
            Fichier indisponible.
          </p>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {document.name} » sera definitivement supprime, fichier compris.
              Cette action est irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={busy}
              className="bg-danger text-[var(--color-accent-fg)] hover:bg-danger/90"
            >
              Supprimer definitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
