import { createFileRoute } from '@tanstack/react-router'
import { m } from '~/lib/paraglide/messages'
import { PageToolbar } from '~/components/app/page-toolbar'
import { OrgHub } from '~/components/org/org-hub'

/**
 * Page Organisation : hub d'équipe adaptatif selon le rôle (création/invitations
 * si pas d'org, sinon membres / équipe / métriques / réglages). La visibilité
 * transversale et le pointage des priorités vivent côté serveur (convex/team,
 * convex/opportunities.flagPriority).
 */
export const Route = createFileRoute('/app/organisation')({
  component: OrganisationPage,
  head: () => ({ meta: [{ title: m.org_page_title() }] }),
})

function OrganisationPage() {
  return (
    <div className="flex flex-col">
      <PageToolbar title={m.org_page_title()} subtitle={m.org_page_subtitle()} />
      <OrgHub />
    </div>
  )
}
