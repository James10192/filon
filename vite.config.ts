import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

export default defineConfig({
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
      'better-auth',
      'fumadocs-core',
      'fumadocs-ui',
      'fumadocs-mdx',
      'next-themes',
    ],
    // Libs navigateur-only (export Excel/PDF), importées dynamiquement dans des
    // handlers onClick : jamais dans le graphe SSR. Externalisées par sécurité.
    external: ['xlsx', 'jspdf', 'jspdf-autotable'],
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
    // React Refresh / Fast Refresh (HMR) en dev + transformation JSX.
    // Requis par TanStack Start en mode dev (sinon le client entry échoue
    // et l'app tourne en SSR seul, sans hydratation ni JS client).
    viteReact(),
    nitro({ preset: process.env.NITRO_PRESET ?? 'vercel' }),
  ],
})
