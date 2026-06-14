import { type Locale } from '~/lib/paraglide/runtime'
import { useLocale } from '~/components/i18n/locale-provider'
import { cn } from '~/lib/utils'

/**
 * Selecteur de langue FR | EN, style segmente (shadcn-like), monochrome +
 * accent. 100 % client-only quant a l'etat affiche : au SSR et avant montage,
 * on rend la baseLocale (fr) pour eviter tout mismatch d'hydratation, puis la
 * vraie locale resolue (localStorage "filon-locale") prend le relais.
 *
 * Au changement, on appelle `switchLocale` (LocaleProvider) : `setLocale` en
 * mode `{ reload: false }` PUIS re-render reactif de l'arbre. AUCUN rechargement
 * de page. Cibles tactiles >= h-11 en variante full.
 */
const LOCALES: { value: Locale; label: string; aria: string }[] = [
  { value: 'fr', label: 'FR', aria: 'Francais' },
  { value: 'en', label: 'EN', aria: 'English' },
]

export function LocaleSwitcher({
  className,
  size = 'sm',
}: {
  className?: string
  /** `sm` = compact (header), `lg` = pleines cibles tactiles (reglages). */
  size?: 'sm' | 'lg'
}) {
  const { locale: current, switchLocale, mounted } = useLocale()

  function choose(next: Locale) {
    switchLocale(next)
  }

  return (
    <div
      role="group"
      aria-label="Langue"
      className={cn(
        'inline-flex items-center rounded-[var(--radius)] border border-border bg-surface-2 p-0.5',
        className,
      )}
    >
      {LOCALES.map((loc) => {
        const active = mounted && current === loc.value
        return (
          <button
            key={loc.value}
            type="button"
            aria-label={loc.aria}
            aria-pressed={active}
            onClick={() => choose(loc.value)}
            className={cn(
              'inline-flex items-center justify-center rounded-[calc(var(--radius)-2px)] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)]',
              size === 'lg'
                ? 'h-11 min-w-12 px-3.5 text-sm'
                : 'h-8 min-w-8 px-2 text-xs',
              active
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {loc.label}
          </button>
        )
      })}
    </div>
  )
}
