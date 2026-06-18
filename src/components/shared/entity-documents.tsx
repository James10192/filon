import { useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  UploadCloud,
  X,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  KIND_ICONS,
  KIND_LABELS,
  guessKind,
  type DocKind,
} from '~/components/documents/document-kind'

/** Types d'entites auxquelles un document peut etre rattache (Documents 360). */
export type DocumentEntityType =
  | 'opportunity'
  | 'proposal'
  | 'contact'
  | 'company'

type LinkedDocument = Doc<'documents'> & { url: string | null }

/** Taille maximale acceptee par fichier (20 Mo), alignee sur l'upload global. */
const MAX_SIZE = 20 * 1024 * 1024

/**
 * Bloc « Documents rattaches » a embarquer dans tout panneau de detail
 * (opportunite, proposition, contact, entreprise).
 *
 * Trois actions :
 * - rattacher un document existant de la bibliotheque (combobox recherchable) ;
 * - televerser un nouveau fichier (flux Convex storage en trois temps, puis
 *   rattachement automatique a l'entite) ;
 * - detacher un document (le fichier reste dans la bibliotheque).
 *
 * Compact, premium, mobile-first. Source de verite : `documents.listForEntity`.
 */
export function EntityDocuments({
  entityType,
  entityId,
  /** Titre de la section. Defaut « Documents ». */
  title = 'Documents',
  /** Masque l'en-tete (utile si l'hote fournit deja un titre de panneau). */
  hideHeader = false,
  className,
}: {
  entityType: DocumentEntityType
  /** `_id` de l'entite, passe en chaine (ex. String(opportunity._id)). */
  entityId: string
  title?: string
  hideHeader?: boolean
  className?: string
}) {
  const linked = useQuery(api.documents.listForEntity, {
    entityType,
    entityId,
  }) as LinkedDocument[] | undefined

  const detach = useMutation(api.documents.detachFromEntity)

  const [detaching, setDetaching] = useState<Id<'documents'> | null>(null)

  async function handleDetach(documentId: Id<'documents'>) {
    if (detaching) return
    setDetaching(documentId)
    try {
      await detach({ documentId, entityType, entityId })
      toast.success('Document detache.')
    } catch {
      toast.error('Le detachement a echoue.')
    } finally {
      setDetaching(null)
    }
  }

  const isLoading = linked === undefined
  const linkedIds = new Set((linked ?? []).map((d) => d._id))

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
            <Paperclip className="size-4 text-fg-subtle" />
            {title}
            {linked && linked.length > 0 && (
              <span className="rounded-full bg-surface-2 px-1.5 text-xs font-medium tabular-nums text-fg-subtle">
                {linked.length}
              </span>
            )}
          </h3>
          <AttachMenu
            entityType={entityType}
            entityId={entityId}
            linkedIds={linkedIds}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : linked.length === 0 ? (
        <EmptyAttachments
          entityType={entityType}
          entityId={entityId}
          linkedIds={linkedIds}
          showHeaderAction={hideHeader}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {linked.map((doc) => (
            <LinkedRow
              key={doc._id}
              document={doc}
              detaching={detaching === doc._id}
              onDetach={() => handleDetach(doc._id)}
            />
          ))}
        </ul>
      )}

      {/* Si l'en-tete est masque mais qu'il y a des docs, on offre tout de meme
          un point d'entree pour en rattacher d'autres. */}
      {hideHeader && !isLoading && linked.length > 0 && (
        <AttachMenu
          entityType={entityType}
          entityId={entityId}
          linkedIds={linkedIds}
          variant="row"
        />
      )}
    </section>
  )
}

/** Ligne d'un document rattache : icone de type, nom, meta, ouvrir, detacher. */
function LinkedRow({
  document,
  detaching,
  onDetach,
}: {
  document: LinkedDocument
  detaching: boolean
  onDetach: () => void
}) {
  const kind = document.kind as DocKind
  const Icon = KIND_ICONS[kind] ?? FileText
  const available = Boolean(document.url)

  return (
    <li className="flex items-center gap-2.5 rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg" title={document.name}>
          {document.name}
        </p>
        <Badge variant="outline" className="mt-0.5 h-5 px-1.5">
          {KIND_LABELS[kind] ?? 'Document'}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {available && (
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            aria-label={`Ouvrir « ${document.name} »`}
          >
            <a
              href={document.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-4" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-fg-muted hover:text-danger"
          aria-label={`Detacher « ${document.name} »`}
          onClick={onDetach}
          disabled={detaching}
        >
          {detaching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
        </Button>
      </div>
    </li>
  )
}

/** Etat vide : invite a rattacher un document, avec upload integre. */
function EmptyAttachments({
  entityType,
  entityId,
  linkedIds,
  showHeaderAction,
}: {
  entityType: DocumentEntityType
  entityId: string
  linkedIds: Set<Id<'documents'>>
  showHeaderAction: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Paperclip className="size-4" />
      </span>
      <p className="max-w-xs text-sm text-fg-muted">
        Aucun document rattache. Reliez un CV, une lettre ou un contrat pour
        garder le bon fichier a portee de main.
      </p>
      {showHeaderAction && (
        <AttachMenu
          entityType={entityType}
          entityId={entityId}
          linkedIds={linkedIds}
        />
      )}
    </div>
  )
}

/**
 * Bouton d'action « Rattacher » : popover combinant le choix d'un document
 * existant (combobox sur `documents.list`) et l'upload d'un nouveau fichier.
 */
function AttachMenu({
  entityType,
  entityId,
  linkedIds,
  variant = 'button',
}: {
  entityType: DocumentEntityType
  entityId: string
  linkedIds: Set<Id<'documents'>>
  variant?: 'button' | 'row'
}) {
  const library = useQuery(api.documents.list, {}) as
    | LinkedDocument[]
    | undefined
  const attach = useMutation(api.documents.attachToEntity)
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
  const createDocument = useMutation(api.documents.create)

  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')

  // Documents de la bibliotheque pas encore rattaches a cette entite.
  const available = (library ?? []).filter((d) => !linkedIds.has(d._id))

  async function attachExisting(documentId: Id<'documents'>) {
    if (busy) return
    setBusy(true)
    try {
      await attach({ documentId, entityType, entityId })
      toast.success('Document rattache.')
      setOpen(false)
      setQuery('')
    } catch {
      toast.error('Le rattachement a echoue.')
    } finally {
      setBusy(false)
    }
  }

  async function uploadAndAttach(file: File) {
    if (busy) return
    if (file.size > MAX_SIZE) {
      toast.error(`« ${file.name} » depasse 20 Mo.`)
      return
    }
    setBusy(true)
    try {
      // 1. URL signee. 2. POST du blob. 3. create. 4. rattachement.
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })
      if (!result.ok) throw new Error('upload failed')
      const { storageId } = (await result.json()) as {
        storageId: Id<'_storage'>
      }
      const documentId = (await createDocument({
        name: file.name,
        kind: guessKind(file.name),
        storageId,
        size: file.size,
      })) as Id<'documents'>
      await attach({ documentId, entityType, entityId })
      toast.success('Document televerse et rattache.')
      setOpen(false)
      setQuery('')
    } catch {
      toast.error("L'envoi du document a echoue.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'row' ? (
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-accent hover:text-accent"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Rattacher un document
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Rattacher
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput
            placeholder="Rechercher un document..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {library === undefined ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {(library?.length ?? 0) === 0
                    ? 'Votre bibliotheque est vide.'
                    : 'Aucun document disponible.'}
                </CommandEmpty>
                {available.length > 0 && (
                  <CommandGroup heading="Bibliotheque">
                    {available.map((doc) => {
                      const Icon = KIND_ICONS[doc.kind as DocKind] ?? FileText
                      return (
                        <CommandItem
                          key={doc._id}
                          value={doc.name}
                          onSelect={() => void attachExisting(doc._id)}
                          disabled={busy}
                        >
                          <Icon className="size-4 shrink-0 text-fg-subtle" />
                          <span className="truncate">{doc.name}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </>
            )}
            <CommandGroup className="border-t border-border">
              <CommandItem
                value="__upload__"
                onSelect={() => inputRef.current?.click()}
                disabled={busy}
              >
                <UploadCloud className="size-4 shrink-0 text-accent" />
                <span>Televerser un nouveau fichier</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadAndAttach(file)
          }}
          aria-label="Choisir un fichier a televerser et rattacher"
        />
      </PopoverContent>
    </Popover>
  )
}
