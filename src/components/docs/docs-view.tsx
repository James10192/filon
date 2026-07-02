import { Link } from '@tanstack/react-router'
import { ExternalLink, Home, Menu } from 'lucide-react'
import {
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page'
import { ThemeToggle } from '~/components/app/theme'
import { LocaleSwitcher } from '~/components/i18n/locale-switcher'
import { Button } from '~/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { useLocale } from '~/components/i18n/locale-provider'
import { cn } from '~/lib/utils'
import {
  DOCS_ICONS,
  DOCS_PAGES,
  docsToc,
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
  const toc = docsToc(page, locale)

  return (
    <div className="min-h-[100dvh] bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center gap-3 px-4 md:px-6 lg:px-8">
          <MobileDocsMenu activeSlug={page.slug} />
          <DocsBrand />
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-1 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)_14rem]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] border-r border-border bg-surface/65 lg:block">
          <DocsSidebar activeSlug={page.slug} />
        </aside>

        <main className="min-w-0 px-4 py-8 md:px-8 lg:px-12">
          <article className="mx-auto w-full max-w-3xl">
            <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-muted">
              <Icon className="size-4 shrink-0 text-accent" />
              <span className="truncate">{copy.updated}</span>
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
                              <ItemIcon className="size-4 shrink-0 text-accent" />
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
          </article>
        </main>

        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] border-l border-border px-6 py-8 xl:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            {copy.onThisPage}
          </p>
          <nav className="flex flex-col gap-1">
            {toc.map((item) => (
              <a
                key={item.url}
                href={item.url}
                className="rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                {item.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}

function DocsBrand() {
  return (
    <Link to="/docs" className="flex min-w-0 items-center gap-2.5 text-fg">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
        <DOCS_ICONS.app className="size-5" />
      </span>
      <span className="min-w-0 text-base font-semibold leading-tight">
        Filon Docs
      </span>
    </Link>
  )
}

function DocsSidebar({ activeSlug }: { activeSlug: string }) {
  const { locale } = useLocale()
  const copy = copyFor(locale)

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <nav className="flex flex-col gap-1.5">
        <Link
          to="/"
          className="flex h-11 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {copy.home}
        </Link>
        <Link
          to="/app"
          className="flex h-11 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {copy.workspace}
        </Link>
      </nav>

      <div className="min-w-0">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          Documentation
        </p>
        <nav className="flex flex-col gap-1">
          {DOCS_PAGES.map((item) => (
            <DocsNavItem
              key={item.slug}
              page={item}
              active={activeSlug === item.slug}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}

function DocsNavItem({
  page,
  active,
}: {
  page: (typeof DOCS_PAGES)[number]
  active: boolean
}) {
  const { locale } = useLocale()
  const Icon = page.icon
  const className = cn(
    'flex min-h-11 items-start gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium leading-snug transition-colors',
    active
      ? 'bg-accent-soft text-accent'
      : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  )

  if (page.slug === 'vue-ensemble') {
    return (
      <Link to="/docs" className={className}>
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span>{page.title[locale]}</span>
      </Link>
    )
  }

  return (
    <Link to="/docs/$slug" params={{ slug: page.slug }} className={className}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{page.title[locale]}</span>
    </Link>
  )
}

function MobileDocsMenu({ activeSlug }: { activeSlug: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Menu documentation"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,88vw)] gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-left">
            <DOCS_ICONS.app className="size-5 text-accent" />
            Filon Docs
          </SheetTitle>
        </SheetHeader>
        <DocsSidebar activeSlug={activeSlug} />
      </SheetContent>
    </Sheet>
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
        updated: "Documentation à jour avec l'app actuelle",
        createAccount: 'Créer un compte',
        openInApp: "Voir dans l'application",
        modulesTitle: 'Modules documentés',
        onThisPage: 'Dans cette page',
        notFoundKicker: 'Documentation',
        notFoundTitle: 'Page introuvable',
        notFoundBody: "Cette page de documentation n'existe pas ou a été déplacée.",
        backDocs: 'Retour à la documentation',
      }
    : {
        home: 'Home',
        workspace: 'Open Filon',
        updated: 'Documentation current with the live app',
        createAccount: 'Create an account',
        openInApp: 'Open in app',
        modulesTitle: 'Documented modules',
        onThisPage: 'On this page',
        notFoundKicker: 'Documentation',
        notFoundTitle: 'Page not found',
        notFoundBody: 'This documentation page does not exist or has moved.',
        backDocs: 'Back to documentation',
      }
}
