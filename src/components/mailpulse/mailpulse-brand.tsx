import { Mail } from 'lucide-react'
import { cn } from '~/lib/utils'

export function MailPulseLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-orange-600',
        'dark:text-orange-500',
        className,
      )}
    >
      <Mail className="size-5" strokeWidth={2.4} />
    </span>
  )
}

export function MailPulseWordmark({
  className,
  showLogo = true,
}: {
  className?: string
  showLogo?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-tight text-zinc-950 dark:text-zinc-50',
        className,
      )}
    >
      {showLogo && <MailPulseLogo className="size-8" />}
      <span>
        Mail<span className="text-orange-600 dark:text-orange-400">Pulse</span>
      </span>
    </span>
  )
}

export const mailpulsePanelClassName =
  'border-orange-200/80 bg-orange-50/55 dark:border-orange-900/50 dark:bg-orange-950/15'
