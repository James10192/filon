import { Link } from '@tanstack/react-router'
import { KanbanSquare } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/** Pied de page public. Liens informatifs (non actifs pour l'instant). */
export function MarketingFooter() {
  const COLUMNS = [
    {
      title: m.footer_col_product(),
      links: [
        m.footer_link_pillars(),
        m.footer_link_views(),
        m.footer_link_pricing(),
      ],
    },
    {
      title: m.footer_col_resources(),
      links: [
        m.footer_link_getting_started(),
        m.footer_link_help(),
        m.footer_link_contact(),
      ],
    },
    {
      title: m.footer_col_legal(),
      links: [
        m.footer_link_privacy(),
        m.footer_link_terms(),
        m.footer_link_legal_notice(),
      ],
    },
  ]
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-fg"
              aria-label={m.footer_home_aria()}
            >
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
                <KanbanSquare className="size-4.5" />
              </span>
              <span className="text-lg font-semibold tracking-[-0.02em]">
                Filon
              </span>
            </Link>
            <p className="max-w-xs text-sm text-fg-muted">
              {m.footer_tagline()}
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
          <p className="text-xs text-fg-subtle">{m.footer_rights()}</p>
        </div>
      </div>
    </footer>
  )
}
