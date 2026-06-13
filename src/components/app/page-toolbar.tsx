import { cn } from '~/lib/utils'

/**
 * En-tete de page unifiee, dense et sobre.
 *
 * Toutes les pages app/* l'utilisent a la place de leur <header> ad hoc :
 *
 *   <PageToolbar
 *     title="Opportunites"
 *     subtitle="Toutes vos pistes, candidatures et missions"
 *     actions={<Button>...</Button>}
 *   >
 *     {/* barre de filtres optionnelle, rendue sous le titre *\/}
 *   </PageToolbar>
 *
 * - Titre 18-20px semibold, tracking -0.02em.
 * - Rythme serre : padding vertical reduit, separateur bas.
 * - `sticky` optionnel : colle l'en-tete sous la topbar (top-16) au scroll.
 */
export function PageToolbar({
  title,
  subtitle,
  actions,
  children,
  sticky = false,
  className,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  sticky?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-5 border-b border-border bg-bg',
        sticky && 'sticky top-16 z-20 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.02em] text-fg">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-fg-muted">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {children && <div className="pb-3">{children}</div>}
    </div>
  )
}
