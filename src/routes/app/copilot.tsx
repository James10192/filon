import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/lib/paraglide/messages'
import { CopilotPanel } from '~/components/copilot/copilot-panel'

export const Route = createFileRoute('/app/copilot')({
  component: CopilotPage,
  head: () => ({
    meta: [{ title: m.app_copilot_page_title() }],
  }),
})

/**
 * Surface plein écran du copilote (complément du tiroir global). Le panneau gère
 * son propre gating (accès au palier / crédits), sa conversation streamée et sa
 * saisie ; on l'enveloppe ici dans une carte calée sur la hauteur disponible.
 */
function CopilotPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-fg">
          {m.copilot_title()}
        </h1>
        <p className="text-sm text-fg-muted">{m.copilot_subtitle()}</p>
      </div>
      <div className="flex h-[calc(100svh-12rem)] min-h-[26rem] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface lg:h-[calc(100svh-10rem)]">
        <CopilotPanel />
      </div>
    </div>
  )
}
