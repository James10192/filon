import { Monitor, Moon, Sun } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { useTheme } from '~/components/app/theme'
import { LocaleSwitcher } from '~/components/i18n/locale-switcher'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

/**
 * Section apparence : choix du theme clair / sombre. Le theme est applique
 * immediatement (client-only, persistant en localStorage via le ThemeProvider).
 * Avant montage, on rend l'option claire selectionnee par defaut pour eviter
 * tout mismatch d'hydratation.
 */
export function AppearanceSection() {
  const { theme, setTheme, mounted } = useTheme()
  const active = mounted ? theme : 'light'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.app_appearance_title()}</CardTitle>
        <CardDescription>
          {m.app_appearance_description()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label={m.app_theme_label()}
          className="grid grid-cols-2 gap-3 sm:max-w-md"
        >
          <ThemeOption
            label={m.app_theme_light()}
            icon={Sun}
            selected={active === 'light'}
            onSelect={() => setTheme('light')}
          />
          <ThemeOption
            label={m.app_theme_dark()}
            icon={Moon}
            selected={active === 'dark'}
            onSelect={() => setTheme('dark')}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-fg">
              {m.settings_language()}
            </span>
            <span className="text-sm text-fg-muted">
              {m.settings_language_description()}
            </span>
          </div>
          <LocaleSwitcher size="lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function ThemeOption({
  label,
  icon: Icon,
  selected,
  onSelect,
}: {
  label: string
  icon: typeof Monitor
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] border text-sm font-medium transition-colors',
        selected
          ? 'border-[var(--color-accent)] bg-accent-soft text-accent'
          : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
