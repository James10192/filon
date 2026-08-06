import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

export default defineConfig(({ command }) => ({
  server: { port: 3000 },
  // Évite « more than one copy of React » au SSR : on dédoublonne React et on
  // force le bundling SSR des libs Convex/Better Auth (sinon externalisées,
  // elles résolvent une seconde instance de React).
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  ssr: {
    noExternal: [
      'convex',
      '@convex-dev/better-auth',
      '@convex-dev/react-query',
      '@tanstack/react-query',
      '@tanstack/react-router',
      '@tanstack/react-router-with-query',
      '@tanstack/react-start',
      '@radix-ui/react-dialog',
      'better-auth',
      'fumadocs-core',
      'fumadocs-ui',
      'fumadocs-mdx',
      'lucide-react',
      'next-themes',
    ],
    // Libs navigateur-only (export Excel/PDF), importées dynamiquement dans des
    // handlers onClick : jamais dans le graphe SSR. Externalisées par sécurité.
    external: [
      'xlsx',
      'puppeteer-core',
      '@sparticuz/chromium',
    ],
  },
  plugins: [
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    // i18n compile-time (Paraglide / Inlang). Genere le runtime tree-shakeable
    // dans src/lib/paraglide a partir des messages FR/EN. Strategy SSR-safe :
    // localStorage (cle "filon-locale") = choix EXPLICITE du user, sinon
    // baseLocale (fr). On NE suit PAS la langue du navigateur : Filon est un
    // produit francophone-first (Cote d'Ivoire), le francais est le defaut dur ;
    // l'anglais est un choix volontaire via le selecteur de langue.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      strategy: ['localStorage', 'baseLocale'],
      localStorageKey: 'filon-locale',
    }),
    tailwindcss(),
    // SSR au runtime (Nitro/Vercel). Les pages dépendent de données Convex
    // temps réel : pas de prérendu statique au build pour éviter de figer
    // l'état ou d'échouer faute de connexion Convex au moment du build.
    tanstackStart(),
    nitro({
      // Le preset Vercel ne concerne que le bundle de production. En local,
      // Nitro utilise son serveur de développement standard, sans émulation Vercel.
      ...(command === 'build'
        ? { preset: process.env.NITRO_PRESET ?? 'vercel' }
        : {}),
      // Chromium s'appuie sur des binaires et des chemins relatifs : Nitro doit
      // tracer ces paquets sans les transformer dans le bundle Rollup.
      traceDeps: ['puppeteer-core*', '@sparticuz/chromium*'],
      // En-têtes de sécurité HTTP appliqués à toutes les réponses. Nitro les
      // reporte dans la config de sortie (Build Output API Vercel). Vérifiés
      // par `curl -I` après déploiement (le mécanisme de report dépend du preset).
      //  - nosniff : pas de sniffing de type MIME
      //  - SAMEORIGIN : anti-clickjacking (framing cross-origin interdit)
      //  - Referrer-Policy : ne fuite pas l'URL complète en cross-origin
      //  - Permissions-Policy : coupe caméra/micro/géoloc (non utilisés)
      //  - HSTS : force https (ignoré par les navigateurs en http local)
      routeRules: {
        '/**': {
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Strict-Transport-Security':
              'max-age=31536000; includeSubDomains',
          },
        },
      },
    }),
    // React Refresh / Fast Refresh (HMR) en dev + transformation JSX.
    // Requis par TanStack Start en mode dev (sinon le client entry échoue
    // et l'app tourne en SSR seul, sans hydratation ni JS client).
    viteReact(),
  ],
}))
