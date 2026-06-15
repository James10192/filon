import { useState } from 'react'
import { CircleUser, KanbanSquare, type LucideIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { ProfileSection } from './profile-section'
import { ProfilePhotoSection } from './profile-photo-section'
import { PreferencesSection } from './preferences-section'
import { AppearanceSection } from './appearance-section'
import { AccountSection } from './account-section'
import { LinkedAccountsSection } from './linked-accounts-section'
import { SubscriptionManagement } from './subscription-management'

type SectionKey = 'compte' | 'preferences'

type Section = {
  key: SectionKey
  label: string
  description: string
  icon: LucideIcon
}

/** Sections de reglages, dans l'ordre du rail de navigation. */
const SECTIONS: Section[] = [
  {
    key: 'compte',
    label: 'Compte',
    description: 'Profil et session',
    icon: CircleUser,
  },
  {
    key: 'preferences',
    label: 'Préférences',
    description: 'Devise et pipeline',
    icon: KanbanSquare,
  },
]

/**
 * Disposition des reglages facon Linear / Vercel : rail de sections a gauche
 * (vertical desktop, defilement horizontal mobile) + contenu a droite dans une
 * largeur contenue. Le rail occupe l'espace au lieu de laisser une colonne
 * etroite centree sur une page large.
 */
export function SettingsLayout() {
  const [active, setActive] = useState<SectionKey>('compte')

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <SettingsNav active={active} onSelect={setActive} />

      <div className="min-w-0 flex-1">
        <div className="flex max-w-2xl flex-col gap-6">
          {active === 'compte' ? (
            <>
              <ProfileSection />
              <ProfilePhotoSection />
              <SubscriptionManagement />
              <LinkedAccountsSection />
              <AccountSection />
            </>
          ) : (
            <>
              <AppearanceSection />
              <PreferencesSection />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsNav({
  active,
  onSelect,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
}) {
  return (
    <nav
      aria-label="Sections des paramètres"
      className={cn(
        'flex shrink-0 gap-1.5 overflow-x-auto pb-1 lg:w-56 lg:flex-col lg:overflow-visible lg:pb-0',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {SECTIONS.map((section) => {
        const Icon = section.icon
        const isActive = active === section.key
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => onSelect(section.key)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex h-11 shrink-0 items-center gap-3 rounded-[var(--radius)] px-3 text-left text-sm transition-colors lg:h-auto lg:py-2.5',
              isActive
                ? 'bg-accent-soft text-accent'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0',
                isActive ? 'text-accent' : 'text-fg-subtle',
              )}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{section.label}</span>
              <span
                className={cn(
                  'hidden truncate text-xs lg:block',
                  isActive ? 'text-accent/70' : 'text-fg-subtle',
                )}
              >
                {section.description}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
