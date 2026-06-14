import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { PageToolbar } from '~/components/app/page-toolbar'
import { ImportOfferDialog } from '~/components/veille/import-offer-dialog'
import { SavedSearchManager } from '~/components/veille/saved-search-manager'

export const Route = createFileRoute('/app/veille')({
  component: VeillePage,
  head: () => ({ meta: [{ title: 'Veille · Filon' }] }),
})

function VeillePage() {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Veille & import"
        subtitle="Importez des offres et surveillez educarriere automatiquement."
        actions={
          <Button onClick={() => setImportOpen(true)}>
            Importer une offre
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <SavedSearchManager />
        <LinkedInNote />
      </div>

      <ImportOfferDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

/** Note honnête : LinkedIn ne peut pas être surveillé automatiquement. */
function LinkedInNote() {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-info-soft text-info">
          <Info className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-fg">
            LinkedIn : import manuel uniquement
          </h3>
          <p className="text-sm text-fg-muted">
            La surveillance automatique de LinkedIn n'est pas possible : la
            plateforme exige une authentification et ses conditions
            d'utilisation interdisent la collecte automatisée. Pour ajouter une
            offre LinkedIn, utilisez « Importer une offre » puis collez son lien
            ou son texte.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
