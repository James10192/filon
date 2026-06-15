import { cn } from '~/lib/utils'

/**
 * Jauge horizontale minimale : un rail (`bg-surface-2`) et un remplissage animé.
 * `percent` est borné à [0, 100]. `barClassName` permet de teinter le
 * remplissage (accent par défaut, neutre ou sémantique selon le contexte).
 */
export function ProgressBar({
  percent,
  className,
  barClassName,
}: {
  percent: number
  className?: string
  barClassName?: string
}) {
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div
      className={cn(
        'h-1.5 overflow-hidden rounded-full bg-surface-2',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full bg-accent transition-[width] duration-500',
          barClassName,
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
