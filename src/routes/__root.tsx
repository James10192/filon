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
import { ThemeProvider } from '~/components/app/theme'
import appCss from '../styles/app.css?url'

/**
 * Script anti-FOUC : applique la classe `.dark` sur <html> AVANT l'hydratation,
 * en lisant la cle localStorage "filon-theme" (override) puis la preference
 * systeme (prefers-color-scheme). Defaut = systeme, donc la landing ouvre en
 * clair quand le systeme est clair (style zed). Inline + synchrone dans le
 * <head> : aucun flash de theme. Le ThemeProvider reprend la main apres montage.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('filon-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;if(t==='dark'){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(e){}})();`

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
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
