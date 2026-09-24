// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Garde de dépendances. Ces paquets tiennent un état au niveau du module
 * (registre des couches, pile de focus, verrou de défilement). Deux versions
 * dans le lockfile, c'est deux registres qui s'ignorent : les menus ouverts dans
 * une Dialog deviennent inutilisables (régression d'août 2026).
 *
 * Si ce test échoue après un `pnpm add` ou un upgrade : réaligner les versions
 * sur la famille du méta-paquet `radix-ui` (seule source d'import Radix de
 * l'app), ne pas assouplir le test.
 */
const SHARED_STATE_PACKAGES = [
  '@radix-ui/react-dismissable-layer',
  '@radix-ui/react-focus-scope',
  '@radix-ui/react-focus-guards',
  'react-remove-scroll',
  'aria-hidden',
]

const lockfile = readFileSync(
  new URL('../../../pnpm-lock.yaml', import.meta.url),
  'utf8',
)

function lockedVersions(name: string): string[] {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  const entry = new RegExp(`^  '?${escaped}@(\\d[^(':\\s]*)`, 'gm')
  return [...new Set([...lockfile.matchAll(entry)].map((match) => match[1]))]
}

describe('Couches Radix à état partagé', () => {
  it.each(SHARED_STATE_PACKAGES)('%s est verrouillé en une seule version', (name) => {
    expect(lockedVersions(name)).toHaveLength(1)
  })
})
