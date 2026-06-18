import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AlertTriangle, FileText, Library, Link2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { PageToolbar } from '~/components/app/page-toolbar'
import { DocumentCard } from '~/components/documents/document-card'
import { DocumentRenameDialog } from '~/components/documents/document-rename-dialog'
import { DocumentUpload } from '~/components/documents/document-upload'
import { DocumentAttachmentsExplorer } from '~/components/documents/document-attachments-explorer'
import {
  DOC_KINDS,
  KIND_LABELS,
  type DocKind,
} from '~/components/documents/document-kind'

export const Route = createFileRoute('/app/documents')({
  component: DocumentsPage,
  head: () => ({ meta: [{ title: 'Filon · Documents' }] }),
})

type DocumentRow = Doc<'documents'> & { url: string | null }
type TabValue = 'all' | DocKind

function DocumentsPage() {
  // Une seule requete : tout charger, filtrer/compter cote client par onglet.
  const documents = useQuery(api.documents.list, {}) as
    | DocumentRow[]
    | undefined

  const [tab, setTab] = useState<TabValue>('all')
  const [view, setView] = useState<'library' | 'attachments'>('library')
  const [editing, setEditing] = useState<Doc<'documents'> | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)

  const counts = useMemo(() => {
    const base: Record<TabValue, number> = {
      all: 0,
      cv: 0,
      lettre: 0,
      portfolio: 0,
      contrat: 0,
      autre: 0,
    }
    if (!documents) return base
    base.all = documents.length
    for (const doc of documents) {
      base[doc.kind as DocKind] += 1
    }
    return base
  }, [documents])

  const filtered = useMemo(() => {
    if (!documents) return []
    if (tab === 'all') return documents
    return documents.filter((doc) => doc.kind === tab)
  }, [documents, tab])

  function openEdit(document: Doc<'documents'>) {
    setEditing(document)
    setRenameOpen(true)
  }

  const hasDocuments = documents !== undefined && documents.length > 0

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Documents"
        subtitle="Votre bibliothèque de CV, lettres, portfolios et contrats, et leurs rattachements à vos opportunités, propositions et contacts."
      />

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as 'library' | 'attachments')}
      >
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="library">
            <Library className="size-4" />
            Bibliothèque
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Link2 className="size-4" />
            Par rattachement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          {/* La zone d'upload est toujours visible. Compacte des qu'il y a des docs. */}
          <DocumentUpload compact={hasDocuments} />

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabValue)}
            className="mt-6"
          >
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="all">
                Tous
                <Count n={counts.all} active={tab === 'all'} />
              </TabsTrigger>
              {DOC_KINDS.map((kind) => (
                <TabsTrigger key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                  <Count n={counts[kind]} active={tab === kind} />
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={tab}>
              <DocumentsBody
                documents={documents}
                filtered={filtered}
                tab={tab}
                onEdit={openEdit}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="attachments">
          <DocumentAttachmentsExplorer />
        </TabsContent>
      </Tabs>

      <DocumentRenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        document={editing}
      />
    </div>
  )
}

function DocumentsBody({
  documents,
  filtered,
  tab,
  onEdit,
}: {
  documents: DocumentRow[] | undefined
  filtered: DocumentRow[]
  tab: TabValue
  onEdit: (document: Doc<'documents'>) => void
}) {
  // Chargement initial.
  if (documents === undefined) {
    return <GridSkeleton />
  }

  // Etat vide global : aucun document, l'upload ci-dessus est deja mis en avant.
  if (documents.length === 0) {
    return <EmptyState />
  }

  // Etat vide d'onglet (type sans document).
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-fg">
          {tab === 'all'
            ? 'Aucun document ajoute.'
            : `Aucun document de type « ${KIND_LABELS[tab as DocKind]} ».`}
        </p>
        <p className="max-w-sm text-sm text-fg-muted">
          Glissez un fichier dans la zone ci-dessus pour l'ajouter.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((document) => (
        <DocumentCard key={document._id} document={document} onEdit={onEdit} />
      ))}
    </div>
  )
}

function Count({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={
        active
          ? 'ml-0.5 rounded-full bg-accent-soft px-1.5 text-xs font-medium tabular-nums text-accent'
          : 'ml-0.5 rounded-full bg-surface-2 px-1.5 text-xs font-medium tabular-nums text-fg-subtle'
      }
    >
      {n}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <FileText className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-fg">
          Aucun document pour l'instant
        </h2>
        <p className="mx-auto max-w-md text-sm text-fg-muted">
          Gardez le bon CV et la bonne lettre face a chaque opportunite.
          Televersez vos fichiers depuis la zone ci-dessus pour demarrer votre
          bibliotheque.
        </p>
      </div>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-[var(--radius)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Encart d'erreur reutilisable (conserve pour usage explicite ; Convex remonte
 * les erreurs de requete au niveau du router par defaut).
 */
export function DocumentsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-danger/40 bg-danger-soft px-6 py-10 text-center">
      <AlertTriangle className="size-6 text-danger" />
      <p className="text-sm font-medium text-danger">
        Impossible de charger les documents.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Reessayer
      </Button>
    </div>
  )
}
