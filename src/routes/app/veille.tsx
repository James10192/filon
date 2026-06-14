import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { PageToolbar } from '~/components/app/page-toolbar'
import { ImportOfferDialog } from '~/components/veille/import-offer-dialog'
import { SavedSearchManager } from '~/components/veille/saved-search-manager'

export const Route = createFileRoute('/app/veille')({
  component: VeillePage,
  head: () => ({ meta: [{ title: 'Veille · Filon' }] }),
  // Ouverture directe de l'import depuis la palette de commandes (?import).
  validateSearch: (search: Record<string, unknown>): { import?: boolean } =>
    search.import ? { import: true } : {},
})

function VeillePage() {
  const [importOpen, setImportOpen] = useState(false)

  // Auto-ouverture du dialog d'import via la palette (?import), nettoyee ensuite.
  const { import: importParam } = Route.useSearch()
  const navigate = useNavigate()
  useEffect(() => {
    if (!importParam) return
    setImportOpen(true)
    void navigate({ to: '/app/veille', replace: true })
  }, [importParam, navigate])

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Veille & import"
        subtitle="Importez des offres et surveillez educarriere automatiquement."
        actions={
          <Button onClick={() => setImportOpen(true)}>Importer une offre</Button>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="reveal" style={{ '--reveal-i': 0 } as React.CSSProperties}>
          <SavedSearchManager />
        </div>
        <div className="reveal" style={{ '--reveal-i': 1 } as React.CSSProperties}>
          <LinkedInNote />
        </div>
      </div>

      <ImportOfferDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

/** Note honnete : LinkedIn ne peut pas etre surveille automatiquement. */
function LinkedInNote() {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-fg-subtle">
        <Info className="size-4" />
      </span>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fg">
          LinkedIn : import manuel uniquement
        </h3>
        <p className="text-sm leading-relaxed text-fg-muted">
          La surveillance automatique de LinkedIn n'est pas possible : la
          plateforme exige une authentification et ses conditions d'utilisation
          interdisent la collecte automatisée. Pour ajouter une offre LinkedIn,
          utilisez « Importer une offre » puis collez son lien ou son texte.
        </p>
      </div>
    </div>
  )
}
