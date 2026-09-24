import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

// Config de test isolée : les composants n'ont besoin ni de TanStack Start ni de
// Nitro (réservés au SSR), seulement des alias `~` et de la transformation JSX.
export default defineConfig({
  plugins: [viteTsConfigPaths({ projects: ['./tsconfig.json'] }), viteReact()],
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
