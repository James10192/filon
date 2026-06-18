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
import { m } from '~/lib/paraglide/messages'

export const Route = createFileRoute('/app/veille')({
  component: VeillePage,
  head: () => ({ meta: [{ title: m.veille_page_meta_title() }] }),
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
        title={m.veille_title()}
        subtitle={m.veille_subtitle()}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <RunNowButton />
            <Button
              onClick={() => setImportOpen(true)}
              className="flex-1 sm:flex-none"
            >
              {m.veille_import_offer()}
            </Button>
          </div>
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
