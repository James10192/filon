import { Sparkles } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { useCopilotLauncher } from './copilot-provider'

type Variant = 'button' | 'icon'

/**
 * Point d'entrée contextuel vers le copilote, réutilisable sur toute page :
 * ouvre le tiroir et pré-remplit la saisie avec `seed` (prompt ciblé). Deux
 * formes : `button` (libellé + icône Sparkles) ou `icon` (carré compact pour
 * les en-têtes de cartes / lignes). i18n complet.
 */
export function AskCopilotButton({
  seed,
  variant = 'button',
  label,
  ariaLabel,
  size = 'sm',
  buttonVariant = 'outline',
  className,
}: {
  seed: string
  variant?: Variant
  /** Libellé custom (par défaut « Demander au copilote »). */
  label?: string
  /** Aria-label custom pour la forme icône. */
  ariaLabel?: string
  size?: 'sm' | 'default' | 'lg'
  buttonVariant?: 'default' | 'secondary' | 'outline' | 'ghost'
  className?: string
}) {
  const copilot = useCopilotLauncher()
  const text = label ?? m.ask_copilot()
  const aria = ariaLabel ?? text

  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant={buttonVariant}
        size={size === 'sm' ? 'icon-sm' : 'icon'}
        aria-label={aria}
        title={aria}
        className={cn('text-accent', className)}
        onClick={() => copilot.open(seed)}
      >
        <Sparkles className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant={buttonVariant}
      size={size}
      className={className}
      onClick={() => copilot.open(seed)}
    >
      <Sparkles className="size-4 text-accent" />
      {text}
    </Button>
  )
}
