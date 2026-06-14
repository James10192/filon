/** Carte de section pour la page détail d'une proposition (titre + action + corps). */
export function DetailPanel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}
