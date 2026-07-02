import { Link } from '@tanstack/react-router'
import { ExternalLink, Home } from 'lucide-react'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { ThemeToggle } from '~/components/app/theme'
import { LocaleSwitcher } from '~/components/i18n/locale-switcher'
import { Button } from '~/components/ui/button'
import { useLocale } from '~/components/i18n/locale-provider'
import { cn } from '~/lib/utils'
import {
  DOCS_ICONS,
  DOCS_PAGES,
  docsToc,
  docsTree,
  getDocsPage,
} from './docs-content'

type DocsViewProps = {
  slug?: string
}

export function DocsView({ slug }: DocsViewProps) {
  const { locale } = useLocale()
  const page = getDocsPage(slug)
  const copy = copyFor(locale)

  if (!page) return <DocsNotFound />

  const Icon = page.icon
  const tree = docsTree(locale)

  return (
    <DocsLayout
      tree={tree}
      nav={{
        title: (
          <Link to="/docs" className="flex items-center gap-2 text-fg">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
              <DOCS_ICONS.app className="size-4.5" />
            </span>
            <span className="font-semibold">Filon Docs</span>
          </Link>
        ),
        url: '/docs',
        children: (
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        ),
      }}
      links={[
        { type: 'main', text: copy.home, url: '/' },
        { type: 'button', text: copy.workspace, url: '/app' },
      ]}
      searchToggle={{ enabled: false }}
      themeSwitch={{ enabled: false }}
      sidebar={{ defaultOpenLevel: 1 }}
    >
      <DocsPage
        toc={docsToc(page, locale)}
        tableOfContent={{ enabled: true }}
        footer={{ enabled: true }}
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-muted">
          <Icon className="size-4 text-accent" />
          {copy.updated}
        </div>
        <DocsTitle>{page.title[locale]}</DocsTitle>
        <DocsDescription>{page.description[locale]}</DocsDescription>

        <DocsBody className="mt-8">
          <div className="not-prose mb-8 grid gap-3 sm:grid-cols-2">
            <ActionLink href="/inscription" label={copy.createAccount} primary />
            <ActionLink href={page.appHref ?? '/app'} label={copy.openInApp} />
          </div>

          {page.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2>{section.title[locale]}</h2>
              <p>{section.body[locale]}</p>
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet[locale]}>{bullet[locale]}</li>
                ))}
              </ul>
            </section>
          ))}

          {page.slug === 'vue-ensemble' && (
            <section id="modules" className="scroll-mt-24">
              <h2>{copy.modulesTitle}</h2>
              <div className="not-prose grid gap-3 sm:grid-cols-2">
                {DOCS_PAGES.filter((item) => item.slug !== 'vue-ensemble').map(
                  (item) => {
                    const ItemIcon = item.icon
                    return (
                      <Link
                        key={item.slug}
                        to="/docs/$slug"
                        params={{ slug: item.slug }}
                        className="group rounded-[var(--radius)] border border-border bg-surface p-4 text-fg transition-colors hover:border-accent/45"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <ItemIcon className="size-4 text-accent" />
                          <span className="font-semibold">
                            {item.title[locale]}
                          </span>
                        </div>
                        <p className="m-0 text-sm leading-relaxed text-fg-muted">
                          {item.description[locale]}
                        </p>
                      </Link>
                    )
                  },
                )}
              </div>
            </section>
          )}
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  )
}

function ActionLink({
  href,
  label,
  primary = false,
}: {
  href: string
  label: string
  primary?: boolean
}) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] border px-4 text-sm font-medium transition-colors',
        primary
          ? 'border-accent bg-accent text-accent-fg hover:bg-accent-hover'
          : 'border-border bg-surface text-fg hover:bg-surface-2',
      )}
    >
      {label}
      <ExternalLink className="size-4" />
    </a>
  )
}

function DocsNotFound() {
  const { locale } = useLocale()
  const copy = copyFor(locale)
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-6">
        <p className="text-sm font-medium text-accent">{copy.notFoundKicker}</p>
        <h1 className="mt-2 text-2xl font-semibold">{copy.notFoundTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {copy.notFoundBody}
        </p>
        <Button asChild className="mt-5">
          <Link to="/docs">
            <Home className="size-4" />
            {copy.backDocs}
          </Link>
        </Button>
      </div>
    </main>
  )
}

function copyFor(locale: 'fr' | 'en') {
  return locale === 'fr'
    ? {
        home: 'Accueil',
        workspace: 'Ouvrir Filon',
        updated: 'Documentation à jour avec l’app actuelle',
        createAccount: 'Créer un compte',
        openInApp: 'Voir dans l’application',
        modulesTitle: 'Modules documentés',
        notFoundKicker: 'Documentation',
        notFoundTitle: 'Page introuvable',
        notFoundBody: 'Cette page de documentation n’existe pas ou a été déplacée.',
        backDocs: 'Retour à la documentation',
      }
    : {
        home: 'Home',
        workspace: 'Open Filon',
        updated: 'Documentation current with the live app',
        createAccount: 'Create an account',
        openInApp: 'Open in app',
        modulesTitle: 'Documented modules',
        notFoundKicker: 'Documentation',
        notFoundTitle: 'Page not found',
        notFoundBody: 'This documentation page does not exist or has moved.',
        backDocs: 'Back to documentation',
      }
}
