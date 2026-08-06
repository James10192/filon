import type { ReactNode } from 'react'
import { MarketingHeader } from './marketing-header'
import { MarketingFooter } from './marketing-footer'

/**
 * Coquille commune aux pages légales (mentions, confidentialité, conditions).
 *
 * Le contenu est rédigé en français : ce sont des documents à valeur juridique
 * pour un éditeur ivoirien, la traduction intégrale n'apporterait pas de valeur
 * légale et introduirait un risque d'écart entre versions. Les libellés de
 * navigation (pied de page) restent, eux, traduits via Paraglide.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: ReactNode
}) {
  return (
    <div className="bg-bg text-fg">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
          Filon
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-fg">
          {title}
        </h1>
        <p className="mt-2 text-sm text-fg-subtle">
          Dernière mise à jour : {updatedAt}
        </p>
        <div className="mt-10 flex flex-col gap-9 text-[0.95rem] leading-relaxed text-fg-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}

/** Section titrée d'une page légale. */
export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">
        {title}
      </h2>
      {children}
    </section>
  )
}
