import { cn } from '~/lib/utils'

export function MailPulseLogo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-9 w-14 shrink-0 items-center justify-center text-zinc-950 dark:text-zinc-50',
        className,
      )}
    >
      <img
        alt=""
        className="h-full w-full object-contain dark:hidden"
        src="/brand/mailpulse-mark-light.png"
      />
      <img
        alt=""
        className="hidden h-full w-full object-contain dark:block"
        src="/brand/mailpulse-mark-dark.png"
      />
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
      {showLogo && <MailPulseLogo className="h-8 w-12" />}
      <span>
        Mail<span className="text-[var(--mailpulse-signal)]">Pulse</span>
      </span>
    </span>
  )
}

export const mailpulsePanelClassName =
  'border-orange-200/80 bg-orange-50/55 dark:border-orange-900/50 dark:bg-orange-950/15'
