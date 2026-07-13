import { useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import {
  documentFilename,
  renderProposalDocumentHtml,
  type ProposalDocumentModel,
} from '~/lib/proposals/document-template'

export function ProposalPdfPreview({ proposalId }: { proposalId: Id<'proposals'> }) {
  const navigate = useNavigate()
  const preview = useQuery(api.billingProfiles.proposalPreview, { proposalId })
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [downloading, setDownloading] = useState(false)
  const html = useMemo(
    () => preview ? renderProposalDocumentHtml(preview.document as ProposalDocumentModel) : '',
    [preview],
  )

  function back() {
    void navigate({ to: '/app/propositions/$id', params: { id: proposalId } })
  }

  function printDocument() {
    frameRef.current?.contentWindow?.print()
  }

  async function downloadDocument() {
    if (!preview || downloading) return
    if (!preview.canFinalize) {
      toast.error('Complétez les éléments requis avant de finaliser le document.')
      return
    }
    setDownloading(true)
    try {
      const response = await fetch(`/api/propositions/${proposalId}/pdf`, { method: 'POST' })
      const body = await response.json() as { url?: string; message?: string }
      if (!response.ok || !body.url) throw new Error(body.message ?? 'pdf_generation_failed')
      const link = document.createElement('a')
      link.href = body.url
      link.download = documentFilename(preview.document as ProposalDocumentModel)
      link.click()
      toast.success('Le PDF a été généré et archivé dans Documents.')
    } catch {
      toast.error("La génération du PDF a échoué. Réessayez dans un instant.")
    } finally {
      setDownloading(false)
    }
  }

  if (preview === undefined) return <PreviewSkeleton />

  return (
    <div className="mx-auto flex w-full max-w-[82rem] flex-col gap-5">
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-bg/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={back} aria-label="Retour à la proposition">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Aperçu du document</p>
            <p className="truncate text-xs text-fg-muted">
              {preview.document.draft ? 'Brouillon, aucun numéro définitif n’est encore attribué.' : `${preview.document.documentNumber} · Révision ${preview.document.revision}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={printDocument}>
            <Printer className="size-4" /> Imprimer
          </Button>
          <Button size="sm" disabled={downloading || !preview.canFinalize} onClick={() => void downloadDocument()}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Télécharger le PDF
          </Button>
        </div>
      </header>

      {!preview.canFinalize && (
        <section className="rounded-[var(--radius)] border border-warning/30 bg-warning-soft px-4 py-3">
          <p className="text-sm font-medium text-fg">À compléter avant la finalisation</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
            {preview.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}

      <div className="overflow-auto rounded-[var(--radius-lg)] border border-border bg-surface-2 p-2 sm:p-5">
        <iframe
          ref={frameRef}
          title="Aperçu PDF de la proposition"
          srcDoc={html}
          className="mx-auto block h-[calc(297mm+2px)] w-[210mm] max-w-none border-0 bg-white shadow-[var(--shadow-pop)]"
        />
      </div>
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[82rem] flex-col gap-5">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="mx-auto h-[70rem] w-full max-w-[50rem]" />
    </div>
  )
}
