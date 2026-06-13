import { Link } from '@tanstack/react-router'
import { KanbanSquare } from 'lucide-react'

const COLUMNS = [
  {
    title: 'Produit',
    links: ['Fonctionnalités', 'Tarifs', 'Nouveautés'],
  },
  {
    title: 'Ressources',
    links: ['Guide de démarrage', 'Aide', 'Contact'],
  },
  {
    title: 'Légal',
    links: ['Confidentialité', "Conditions d'utilisation", 'Mentions légales'],
  },
] as const

/** Pied de page public. Liens informatifs (non actifs pour l'instant). */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-fg"
              aria-label="Filon, accueil"
            >
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
                <KanbanSquare className="size-4.5" />
              </span>
              <span className="text-lg font-semibold tracking-[-0.02em]">
                Filon
              </span>
            </Link>
            <p className="max-w-xs text-sm text-fg-muted">
              Filon · Ne laissez plus filer une opportunité.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-subtle">
                {col.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((label) => (
                  <li key={label}>
                    <span className="text-sm text-fg-muted transition-colors hover:text-fg">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-fg-subtle">
            © 2026 Filon. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
