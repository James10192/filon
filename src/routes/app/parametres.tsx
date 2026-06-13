import { createFileRoute } from '@tanstack/react-router'
import { ProfileSection } from '~/components/settings/profile-section'
import { PreferencesSection } from '~/components/settings/preferences-section'
import { AccountSection } from '~/components/settings/account-section'

export const Route = createFileRoute('/app/parametres')({
  component: ParametresPage,
  head: () => ({ meta: [{ title: 'Paramètres · Filon' }] }),
})

/**
 * Page Parametres : profil, preferences (devise + libelles du pipeline) et
 * zone compte (deconnexion). Chaque section gere ses propres etats
 * (loading/erreur/succes) et affiche un toast sur action.
 */
function ParametresPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
          Paramètres
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Gérez votre profil, vos préférences de pipeline et votre compte.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <ProfileSection />
        <PreferencesSection />
        <AccountSection />
      </div>
    </div>
  )
}
