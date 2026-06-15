import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { PageToolbar } from '~/components/app/page-toolbar'
import { ImportOfferDialog } from '~/components/veille/import-offer-dialog'
import { SavedSearchManager } from '~/components/veille/saved-search-manager'
import { RecentCaptures } from '~/components/veille/recent-captures'
import { SourceHealthPanel } from '~/components/veille/source-health-panel'
import { VeilleAutoBanner } from '~/components/veille/veille-auto-banner'
import { RunNowButton } from '~/components/veille/run-now-button'
import { UpgradeNudge } from '~/components/billing/upgrade-nudge'

export const Route = createFileRoute('/app/veille')({
  component: VeillePage,
  head: () => ({ meta: [{ title: 'Veille · Filon' }] }),
  // Ouverture directe de l'import depuis la palette de commandes (?import).
  validateSearch: (search: Record<string, unknown>): { import?: boolean } =>
    search.import ? { import: true } : {},
})

function VeillePage() {
  const [importOpen, setImportOpen] = useState(false)
  // Déclencheur de valeur mérité : on tente le nudge après un import réussi.
  const [imported, setImported] = useState(false)

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
        title="Veille"
        subtitle="Votre radar de prospection : surveillez plusieurs sources, captez offres et prospects automatiquement."
        actions={
          <>
            <RunNowButton />
            <Button onClick={() => setImportOpen(true)}>
              Importer une offre
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {imported && (
          <UpgradeNudge id="import_value" variant="value" className="mb-1" />
        )}
        <div className="reveal" style={{ '--reveal-i': 0 } as React.CSSProperties}>
          <VeilleAutoBanner />
        </div>
        <div className="reveal" style={{ '--reveal-i': 1 } as React.CSSProperties}>
          <SavedSearchManager />
        </div>
        <div className="reveal" style={{ '--reveal-i': 2 } as React.CSSProperties}>
          <RecentCaptures />
        </div>
        <div className="reveal" style={{ '--reveal-i': 3 } as React.CSSProperties}>
          <SourceHealthPanel />
        </div>
      </div>

      <ImportOfferDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => setImported(true)}
      />
    </div>
  )
}
