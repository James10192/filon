import { Link } from '@tanstack/react-router'
import { KanbanSquare, Mail } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

const GITHUB_URL = 'https://github.com/James10192'
const EMAIL = 'djedjelipatrick@gmail.com'
const WHATSAPP_URL = 'https://wa.me/2250141540178'

type FooterLink = { label: string; to?: string; href?: string; hash?: string }

/** Pied de page public riche (façon zed.dev) : colonnes de liens, logo, liens
 *  externes (GitHub, e-mail), signature « Conçu à Abidjan », ligne copyright. */
export function MarketingFooter() {
  const COLUMNS: { title: string; links: FooterLink[] }[] = [
    {
      title: m.footer_col_product(),
      links: [
        { label: m.footer_link_pillars(), to: '/', hash: 'produit' },
        { label: m.footer_link_views(), to: '/', hash: 'vues' },
        { label: m.footer_link_pricing(), to: '/', hash: 'tarifs' },
      ],
    },
    {
      title: m.footer_col_resources(),
      links: [
        { label: m.footer_link_docs(), to: '/docs' },
        { label: m.footer_link_getting_started(), to: '/docs', hash: 'demarrage' },
        { label: m.footer_link_github(), href: GITHUB_URL },
      ],
    },
    {
      title: m.footer_col_account(),
      links: [
        { label: m.footer_link_login(), to: '/connexion' },
        { label: m.footer_link_signup(), to: '/inscription' },
        { label: m.footer_link_email(), href: `mailto:${EMAIL}` },
        { label: 'WhatsApp', href: WHATSAPP_URL },
      ],
    },
    {
      title: m.footer_col_legal(),
      links: [
        { label: m.footer_link_privacy(), to: '/', hash: 'tarifs' },
        { label: m.footer_link_terms(), to: '/', hash: 'tarifs' },
        { label: m.footer_link_legal_notice(), to: '/', hash: 'tarifs' },
      ],
    },
  ]

  return (
    <footer className="relative border-t border-border bg-surface">
      {/* Liseré orange→vert très discret (clin d'œil ivoirien, retenue) */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f59e0b]/35 to-[#16a34a]/35"
      />
      <div className="mx-auto w-full max-w-screen-xl px-4 py-14 md:px-6 md:py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Link
              to="/"
              className="flex w-fit items-center gap-2.5 text-fg"
              aria-label={m.footer_home_aria()}
            >
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
                <KanbanSquare className="size-4.5" />
              </span>
              <span className="text-lg font-semibold tracking-[-0.02em]">
                Filon
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-fg-muted">
              {m.footer_tagline()}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={m.footer_github_aria()}
                className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                <GithubMark />
              </a>
              <a
                href={`mailto:${EMAIL}`}
                aria-label={m.footer_email_aria()}
                className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg text-fg-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                <Mail className="size-4.5" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3.5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                {col.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">{m.footer_rights()}</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            {m.footer_made_in()}
            <span aria-hidden="true" className="text-sm leading-none">
              🇨🇮
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}

function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4.5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  )
}

function FooterLinkItem({ label, to, href, hash }: FooterLink) {
  const className =
    'inline-flex min-h-[1.75rem] items-center text-sm text-fg-muted transition-colors hover:text-fg'

  if (href) {
    const external = href.startsWith('http')
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={className}
      >
        {label}
      </a>
    )
  }

  return (
    <Link to={to ?? '/'} hash={hash} className={className}>
      {label}
    </Link>
  )
}
