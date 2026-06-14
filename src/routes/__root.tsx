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
import { LocaleProvider } from '~/components/i18n/locale-provider'
import appCss from '../styles/app.css?url'

/**
 * Script anti-FOUC : applique la classe `.dark` sur <html> AVANT l'hydratation,
 * en lisant la cle localStorage "filon-theme" (override) puis la preference
 * systeme (prefers-color-scheme). Defaut = systeme, donc la landing ouvre en
 * clair quand le systeme est clair (style zed). Inline + synchrone dans le
 * <head> : aucun flash de theme. Le ThemeProvider reprend la main apres montage.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('filon-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;if(t==='dark'){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(e){}})();`

/**
 * Script anti-flash i18n : pose l'attribut <html lang> AVANT l'hydratation en
 * lisant la cle localStorage "filon-locale" (strategy Paraglide). Au SSR, le
 * document est rendu en baseLocale (fr) ; ce script corrige le lang cote client
 * si l'utilisateur a choisi "en", avant que Paraglide ne prenne le relais.
 */
const localeInitScript = `(function(){try{var l=localStorage.getItem('filon-locale');if(l==='en'||l==='fr'){document.documentElement.lang=l;}}catch(e){}})();`

const SITE = {
  url: 'https://filon-xi.vercel.app',
  name: 'Filon',
  // <= 60 c (validators) : 56 caracteres
  title: 'Filon · Votre pipeline de revenus tout-en-un',
  // meta description <= 155 c : 149 caracteres
  description:
    'Centralisez candidatures, missions et prospection freelance dans un pipeline unique, avec relances datées, veille automatique et assistance IA.',
  // og:description <= 125 c : 118 caracteres
  ogDescription:
    'Candidatures, missions et prospection freelance dans un pipeline unique, avec relances datées et veille automatique.',
  ogImage: 'https://filon-xi.vercel.app/og.png',
}

/**
 * JSON-LD (Organization + SoftwareApplication). Offres en XOF alignées sur la
 * grille `convex/lib/pricing.ts` (Pro 3500 / mois, Pro+ IA 9000 / mois). Rendu
 * dans le <head> de la racine pour une couverture sitewide.
 */
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
      url: SITE.url,
      logo: SITE.ogImage,
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE.name,
      url: SITE.url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SITE.description,
      image: SITE.ogImage,
      offers: [
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '3500',
          priceCurrency: 'XOF',
          category: 'monthly',
        },
        {
          '@type': 'Offer',
          name: 'Pro+ IA',
          price: '9000',
          priceCurrency: 'XOF',
          category: 'monthly',
        },
      ],
    },
  ],
})

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
      { property: 'og:locale:alternate', content: 'en_US' },
      { property: 'og:site_name', content: SITE.name },
      { property: 'og:title', content: SITE.title },
      { property: 'og:description', content: SITE.ogDescription },
      { property: 'og:url', content: SITE.url },
      { property: 'og:image', content: SITE.ogImage },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'Filon · pipeline de revenus tout-en-un',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: SITE.title },
      { name: 'twitter:description', content: SITE.ogDescription },
      { name: 'twitter:image', content: SITE.ogImage },
      {
        name: 'twitter:image:alt',
        content: 'Filon · pipeline de revenus tout-en-un',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: SITE.url },
      { rel: 'alternate', hrefLang: 'fr', href: SITE.url },
      { rel: 'alternate', hrefLang: 'en', href: SITE.url },
      { rel: 'alternate', hrefLang: 'x-default', href: SITE.url },
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
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
        {/* JSON-LD Organization + SoftwareApplication (offres XOF). */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <Outlet />
          </LocaleProvider>
        </ThemeProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
