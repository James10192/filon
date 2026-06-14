import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useTheme } from '~/components/app/theme'
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
        <CardTitle>Apparence</CardTitle>
        <CardDescription>
          Choisissez le thème de votre espace. Le réglage est mémorisé sur cet
          appareil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label="Thème"
          className="grid grid-cols-2 gap-3 sm:max-w-md"
        >
          <ThemeOption
            label="Clair"
            icon={Sun}
            selected={active === 'light'}
            onSelect={() => setTheme('light')}
          />
          <ThemeOption
            label="Sombre"
            icon={Moon}
            selected={active === 'dark'}
            onSelect={() => setTheme('dark')}
          />
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
