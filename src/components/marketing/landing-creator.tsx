import { Globe, ExternalLink, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * Section « Créateur » : carte centrée présentant l'auteur de Filon. Monogramme
 * carré indigo (accent), identité, rôle, bio courte et liens externes en
 * deeplink. Direction zed-style alignée sur LandingProof/LandingCta : surface
 * nette, tokens sémantiques (clair/sombre), révélation au scroll ([data-reveal]).
 */
export function LandingCreator() {
  const LINKS = [
    {
      icon: Globe,
      label: m.creator_link_portfolio(),
      href: 'https://marcel-djedjeli-portfolio.vercel.app',
    },
    {
      icon: ExternalLink,
      label: m.creator_link_github(),
      href: 'https://github.com/James10192',
    },
    {
      icon: Mail,
      label: m.creator_link_email(),
      href: 'mailto:Marcel-_12@outlook.fr',
    },
  ]
  return (
    <section className="border-t border-border bg-bg">
      <div className="mx-auto w-full max-w-screen-xl px-4 py-20 md:px-6 md:py-28 lg:px-8">
        <div
          data-reveal
          className="mx-auto flex max-w-2xl flex-col items-center rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-14 text-center md:px-12 md:py-16"
        >
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-accent text-lg font-semibold tracking-tight text-accent-fg"
          >
            MD
          </span>

          <p className="eyebrow mt-8 text-accent">{m.creator_eyebrow()}</p>
          <h2 className="mt-3 text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.025em] text-fg md:text-[2rem]">
            N'Guessan Marcel Jacques Patrick DJEDJE-LI
          </h2>
          <p className="mt-3 text-pretty text-sm font-medium text-fg-muted md:text-base">
            {m.creator_role()}
          </p>

          <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-fg-muted">
            {m.creator_bio()}
          </p>

          <ul className="mt-7 flex flex-wrap justify-center gap-2">
            {TAGS.map((tag) => (
              <li
                key={tag}
                className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1 text-xs font-medium text-fg-muted"
              >
                {tag}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {LINKS.map((link) => (
              <CreatorLink key={link.label} {...link} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CreatorLink({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon
  label: string
  href: string
}) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg px-5 text-sm font-medium text-fg transition-colors hover:border-accent/40 hover:text-accent sm:w-auto"
    >
      <Icon className="size-4" />
      {label}
    </a>
  )
}

const TAGS = [
  'TanStack Start',
  'React',
  'Convex',
  'TypeScript',
  'Laravel',
] as const
