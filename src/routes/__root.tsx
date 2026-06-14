import '../react-global'
// Polices auto-hebergees (@fontsource) : injectent les @font-face au bundle,
// cote serveur ET client. Hanken Grotesk = UI/corps/titres, JetBrains Mono =
// chiffres / metadonnees ("assay"). Poids charges = ceux reellement utilises.
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { ConvexQueryClient } from '@convex-dev/react-query'
import { Toaster } from '~/components/ui/sonner'
import appCss from '../styles/app.css?url'

const SITE = {
  url: 'https://filon.vercel.app',
  name: 'Filon',
  title: 'Filon · Ne laissez plus filer une opportunité de revenu',
  description:
    'Filon centralise vos candidatures, propositions spontanées, prospection freelance et missions dans un pipeline kanban, avec relances datées, contacts, documents et tableau de bord de pilotage.',
}

interface RouterContext {
  queryClient: QueryClient
  convexQueryClient: ConvexQueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: SITE.title },
      { name: 'description', content: SITE.description },
      { name: 'theme-color', content: '#fafafa' },
      { name: 'format-detection', content: 'telephone=no' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:site_name', content: SITE.name },
      { property: 'og:title', content: SITE.title },
      { property: 'og:description', content: SITE.description },
      { property: 'og:url', content: SITE.url },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
