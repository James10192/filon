import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { m } from '~/lib/paraglide/messages'
import { PageToolbar } from '~/components/app/page-toolbar'
import { SettingsLayout, type SettingsSectionKey } from '~/components/settings/settings-layout'

type SettingsFocus = 'mailpulse'
type SettingsSearch = {
  tab?: SettingsSectionKey
  focus?: SettingsFocus
}

export const Route = createFileRoute('/app/parametres')({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    const out: SettingsSearch = {}
    if (search.tab === 'compte' || search.tab === 'preferences') out.tab = search.tab
    if (search.focus === 'mailpulse') out.focus = search.focus
    return out
  },
  component: ParametresPage,
  head: () => ({ meta: [{ title: m.app_parametres_page_title() }] }),
})

/**
 * Page Parametres : navigation par sections (Compte / Preferences) avec un
 * rail a gauche et le contenu a droite, dans une largeur contenue qui occupe
 * l'espace disponible. Chaque section gere ses propres etats (loading / erreur
 * / succes) et affiche un toast sur action.
 */
function ParametresPage() {
  const { tab, focus } = Route.useSearch()
  const activeTab = tab ?? (focus === 'mailpulse' ? 'preferences' : 'compte')
  const navigate = useNavigate({ from: Route.fullPath })

  function selectSection(nextTab: SettingsSectionKey) {
    void navigate({ search: { tab: nextTab } })
  }

  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.app_parametres_title()}
        subtitle={m.app_parametres_subtitle()}
      />
      <SettingsLayout
        activeSection={activeTab}
        focus={focus}
        onSectionChange={selectSection}
      />
    </div>
  )
}
