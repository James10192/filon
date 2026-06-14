import { createFileRoute } from '@tanstack/react-router'
import { PageToolbar } from '~/components/app/page-toolbar'
import { SettingsLayout } from '~/components/settings/settings-layout'

export const Route = createFileRoute('/app/parametres')({
  component: ParametresPage,
  head: () => ({ meta: [{ title: 'Paramètres · Filon' }] }),
})

/**
 * Page Parametres : navigation par sections (Compte / Preferences) avec un
 * rail a gauche et le contenu a droite, dans une largeur contenue qui occupe
 * l'espace disponible. Chaque section gere ses propres etats (loading / erreur
 * / succes) et affiche un toast sur action.
 */
function ParametresPage() {
  return (
    <div className="flex flex-col">
      <PageToolbar
        title="Paramètres"
        subtitle="Gérez votre profil, vos préférences de pipeline et votre compte."
      />
      <SettingsLayout />
    </div>
  )
}
