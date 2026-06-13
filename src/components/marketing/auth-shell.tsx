import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { KanbanSquare } from 'lucide-react'

/**
 * Coquille partagée des pages /connexion et /inscription.
 * Carte centrée, sobre, alignée sur le design system. Aside de réassurance
 * masqué sur mobile pour rester focalisé sur le formulaire.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="grid min-h-[100dvh] bg-bg lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-6 lg:px-10">
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

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
              {title}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>

            <div className="mt-8">{children}</div>

            <div className="mt-6 text-center text-sm text-fg-muted">
              {footer}
            </div>
          </div>
        </div>
      </div>

      <aside className="relative hidden flex-col justify-between border-l border-border bg-surface p-10 lg:flex">
        <Link
          to="/"
          className="text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
        >
          ← Retour au site
        </Link>

        <div className="max-w-md">
          <p className="text-xl font-semibold leading-snug tracking-[-0.01em] text-fg">
            Ne laissez plus filer une seule opportunité.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Candidatures, propositions spontanées, prospection freelance et
            missions en cours : tout vit dans un seul pipeline, avec les
            relances qu'il faut au bon moment.
          </p>
        </div>

        <p className="text-xs text-fg-subtle">
          Sans carte bancaire · Vos données restent privées
        </p>
      </aside>
    </div>
  )
}
